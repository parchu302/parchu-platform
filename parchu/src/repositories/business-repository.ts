import type { Business, BusinessStatus } from "@prisma/client";

import { db } from "@/lib/db";
import type { BusinessInput } from "@/lib/validations/business";

// Toda lectura de negocio filtra la baja logica: un emprendimiento eliminado
// deja de existir para la aplicacion, aunque su historico se conserve.
const NOT_DELETED = { deletedAt: null };

export async function createBusiness(
  ownerId: string,
  input: BusinessInput,
): Promise<Business> {
  return db.business.create({
    data: { ...input, ownerId },
  });
}

export async function findBusinessById(id: string): Promise<Business | null> {
  return db.business.findFirst({ where: { id, ...NOT_DELETED } });
}

// A diferencia del resto de lecturas, esta NO filtra la baja logica: el indice
// unico de `name` es global e incluye los eliminados, asi que un nombre de un
// emprendimiento dado de baja sigue reservado. Consultarlo sin el filtro
// permite devolver un error claro en vez de estrellarse contra el constraint.
export async function findBusinessByNameIncludingDeleted(
  name: string,
): Promise<Business | null> {
  return db.business.findUnique({ where: { name } });
}

export async function listBusinessesByOwner(
  ownerId: string,
): Promise<Business[]> {
  return db.business.findMany({
    where: { ownerId, ...NOT_DELETED },
    orderBy: { createdAt: "asc" },
  });
}

export async function listAllBusinesses(): Promise<
  (Business & { owner: { email: string; firstName: string } })[]
> {
  return db.business.findMany({
    where: NOT_DELETED,
    include: { owner: { select: { email: true, firstName: true } } },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });
}

export async function updateBusinessStatus(
  id: string,
  status: BusinessStatus,
): Promise<Business> {
  return db.business.update({ where: { id }, data: { status } });
}

export async function softDeleteBusiness(
  id: string,
  reason: string,
): Promise<Business> {
  return db.business.update({
    where: { id },
    data: { deletedAt: new Date(), deleteReason: reason },
  });
}

export async function countPlatformStats(): Promise<{
  businesses: number;
  products: number;
  orders: number;
  pendingBusinesses: number;
}> {
  const [businesses, products, orders, pendingBusinesses] = await Promise.all([
    db.business.count({ where: NOT_DELETED }),
    db.product.count({ where: { business: NOT_DELETED } }),
    db.order.count(),
    db.business.count({ where: { ...NOT_DELETED, status: "PENDIENTE" } }),
  ]);

  return { businesses, products, orders, pendingBusinesses };
}
