// Tipos de dominio. Reemplazan los imports de "@prisma/client".
// Derivados de los tipos generados por Supabase (database.types.ts).
//
// Diferencias clave respecto de Prisma:
//   * Columnas numeric(12,2) (price, total, unitPrice, subtotal) llegan como
//     `number` (antes Prisma.Decimal). Usar money.ts para aritmética segura.
//   * Columnas timestamptz (createdAt, updatedAt, deletedAt) llegan como
//     `string` ISO (antes Date). Formatear con new Date(value) donde haga falta.

import type { Database } from "@/lib/supabase/database.types";

export type Role = Database["public"]["Enums"]["Role"];
export type BusinessStatus = Database["public"]["Enums"]["BusinessStatus"];
export type ProductStatus = Database["public"]["Enums"]["ProductStatus"];
export type OrderStatus = Database["public"]["Enums"]["OrderStatus"];
export type PaymentType = Database["public"]["Enums"]["PaymentType"];

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Business = Database["public"]["Tables"]["Business"]["Row"];
export type Product = Database["public"]["Tables"]["Product"]["Row"];
export type PaymentMethod = Database["public"]["Tables"]["PaymentMethod"]["Row"];
export type Order = Database["public"]["Tables"]["Order"]["Row"];
export type OrderItem = Database["public"]["Tables"]["OrderItem"]["Row"];
export type Notification = Database["public"]["Tables"]["Notification"]["Row"];
export type SellerLead = Database["public"]["Tables"]["SellerLead"]["Row"];

// Compat: antes el modelo se llamaba User. La identidad vive ahora en Auth +
// profiles; para el dominio de la app, un "usuario" es su profile.
export type User = Profile;
