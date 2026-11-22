import { authorizeCron } from "@/lib/cron-auth";
import { runOfflineScan } from "@/lib/offline-scan";

async function handle(request: Request) {
  if (!authorizeCron(request)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const summary = await runOfflineScan();
    return Response.json(summary);
  } catch (error) {
    console.error("device-offline cron failed", error);
    return Response.json({ error: "device-offline scan failed" }, { status: 500 });
  }
}

export const GET = handle;
export const POST = handle;
