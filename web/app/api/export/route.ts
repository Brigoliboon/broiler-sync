import { CSV_BOM, CSV_HEADER, csvLine, exportFilename, parseExportQuery, rowValues } from "@/lib/csv";
import { listDevices } from "@/lib/db/devices";
import { compartmentRowPages } from "@/lib/db/export";
import { getFarm } from "@/lib/db/farms";
import { getProfile } from "@/lib/db/profiles";
import { manilaDate } from "@/lib/history";
import { createUserClient, getAuthUserId } from "@/lib/supabase/server";

/**
 * CSV export (FR-22). Cookie session only; the farm must be visible to the
 * caller under RLS (own farms, or any farm for an admin). Streams the rows.
 */
export async function GET(request: Request) {
  const userId = await getAuthUserId();
  if (!userId) return Response.json({ error: "sign in required" }, { status: 401 });

  const query = parseExportQuery(new URL(request.url).searchParams, manilaDate(Date.now()));
  if ("error" in query) return Response.json({ error: query.error }, { status: 400 });

  const client = await createUserClient();
  const [profile, farm] = await Promise.all([getProfile(userId, client), getFarm(query.farmId, client)]);
  if (!profile || profile.disabled_at) return Response.json({ error: "account disabled" }, { status: 403 });
  if (!farm) return Response.json({ error: "farm not found" }, { status: 404 });

  const device = (await listDevices(client)).find((d) => d.farm_id === farm.id);
  if (!device) return Response.json({ error: "this farm has no device" }, { status: 404 });

  const encoder = new TextEncoder();
  const pages = compartmentRowPages(device.device_id, query.start, query.end, query.compartment, client);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(CSV_BOM + csvLine(CSV_HEADER)));
    },
    async pull(controller) {
      try {
        const next = await pages.next();
        if (next.done) {
          controller.close();
          return;
        }
        controller.enqueue(encoder.encode(next.value.map((row) => csvLine(rowValues(row))).join("")));
      } catch (error) {
        console.error("csv export failed", error);
        controller.error(error);
      }
    },
    async cancel() {
      await pages.return(undefined);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${exportFilename(farm.name, query.from, query.to)}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
