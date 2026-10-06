import { createAdminClient } from "@/lib/supabase/admin";
import type { Notification } from "@/lib/types";

export async function createNotification(input: {
  userId: string;
  message: string;
}): Promise<{ id: string }> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("Notification")
    .insert(input)
    .select("id")
    .single();
  if (error) throw error;
  return data;
}

export async function listNotificationsForUser(
  userId: string,
): Promise<Notification[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("Notification")
    .select("*")
    .eq("userId", userId)
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return data;
}

export async function countUnread(userId: string): Promise<number> {
  const sb = createAdminClient();
  const { count, error } = await sb
    .from("Notification")
    .select("*", { count: "exact", head: true })
    .eq("userId", userId)
    .eq("read", false);
  if (error) throw error;
  return count ?? 0;
}

export async function markAllAsRead(userId: string): Promise<number> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("Notification")
    .update({ read: true })
    .eq("userId", userId)
    .eq("read", false)
    .select("id");
  if (error) throw error;
  return data.length;
}
