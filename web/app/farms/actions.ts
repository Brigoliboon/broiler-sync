"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FARM_COOKIE } from "@/lib/db/app-context";
import { listFarms } from "@/lib/db/farms";

const RETURN_PATHS = ["/dashboard", "/history", "/alerts", "/export", "/settings"];

/** Remember the picked farm (only if RLS lets this user see it) and go back. */
export async function selectFarm(formData: FormData): Promise<void> {
  const farmId = String(formData.get("farmId") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");
  const farms = await listFarms();
  if (farms.some((farm) => farm.id === farmId)) {
    const cookieStore = await cookies();
    cookieStore.set(FARM_COOKIE, farmId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  redirect(RETURN_PATHS.includes(next) ? next : "/dashboard");
}
