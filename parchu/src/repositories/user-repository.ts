import type { Role, User } from "@prisma/client";

import { db } from "@/lib/db";

export async function findUserByEmail(email: string): Promise<User | null> {
  return db.user.findUnique({ where: { email: email.toLowerCase() } });
}

export async function createUser(input: {
  email: string;
  passwordHash: string;
  firstName: string;
  lastName?: string;
  role?: Role;
}): Promise<{ id: string; role: Role }> {
  return db.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role ?? "EMPRENDEDOR",
    },
    select: { id: true, role: true },
  });
}
