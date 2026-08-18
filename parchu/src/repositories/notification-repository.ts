import type { Notification } from "@prisma/client";

import { db } from "@/lib/db";

export async function createNotification(input: {
  userId: string;
  message: string;
}): Promise<{ id: string }> {
  return db.notification.create({
    data: input,
    select: { id: true },
  });
}

export async function listNotificationsForUser(
  userId: string,
): Promise<Notification[]> {
  return db.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function countUnread(userId: string): Promise<number> {
  return db.notification.count({ where: { userId, read: false } });
}

export async function markAllAsRead(userId: string): Promise<number> {
  const result = await db.notification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
  return result.count;
}
