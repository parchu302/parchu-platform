"use server";

import { redirect } from "next/navigation";

import { destroySessionCookie } from "@/lib/session-cookie";

export async function logoutAction(): Promise<void> {
  await destroySessionCookie();
  redirect("/login");
}
