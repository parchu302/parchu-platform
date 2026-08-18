import { afterEach, describe, expect, it } from "vitest";

import {
  initialSellerLeadState,
  submitSellerLead,
} from "@/actions/leads/create-seller-lead";
import { db } from "@/lib/db";

const MARKER = "test-fase-0";

function formDataFrom(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

afterEach(async () => {
  await db.sellerLead.deleteMany({ where: { sells: MARKER } });
});

describe("submitSellerLead", () => {
  it("persiste el lead cuando los datos son validos", async () => {
    const state = await submitSellerLead(
      initialSellerLeadState,
      formDataFrom({
        name: "Ana Perez",
        whatsapp: "3000000000",
        sells: MARKER,
      }),
    );

    expect(state.status).toBe("success");

    const stored = await db.sellerLead.findMany({ where: { sells: MARKER } });
    expect(stored).toHaveLength(1);
    expect(stored[0]?.name).toBe("Ana Perez");
  });

  it("no crea ninguna fila cuando falta un campo obligatorio", async () => {
    const before = await db.sellerLead.count();

    const state = await submitSellerLead(
      initialSellerLeadState,
      formDataFrom({ name: "", whatsapp: "3000000000", sells: MARKER }),
    );

    expect(state.status).toBe("error");
    expect(state.errors?.name?.[0]).toBe("El nombre es obligatorio");
    expect(await db.sellerLead.count()).toBe(before);
  });
});
