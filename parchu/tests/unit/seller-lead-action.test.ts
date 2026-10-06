import { afterEach, describe, expect, it } from "vitest";

import { submitSellerLead } from "@/actions/leads/create-seller-lead";
import { initialSellerLeadState } from "@/actions/leads/types";
import { createAdminClient } from "@/lib/supabase/admin";

const MARKER = "test-fase-0";
const sb = createAdminClient();

function formDataFrom(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }
  return formData;
}

afterEach(async () => {
  await sb.from("SellerLead").delete().eq("sells", MARKER);
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

    const { data: stored } = await sb
      .from("SellerLead")
      .select("*")
      .eq("sells", MARKER);
    expect(stored).toHaveLength(1);
    expect(stored?.[0]?.name).toBe("Ana Perez");
  });

  it("no crea ninguna fila cuando falta un campo obligatorio", async () => {
    const countLeads = async () =>
      (await sb.from("SellerLead").select("*", { count: "exact", head: true }))
        .count;
    const before = await countLeads();

    const state = await submitSellerLead(
      initialSellerLeadState,
      formDataFrom({ name: "", whatsapp: "3000000000", sells: MARKER }),
    );

    expect(state.status).toBe("error");
    expect(state.errors?.name?.[0]).toBe("El nombre es obligatorio");
    expect(await countLeads()).toBe(before);
  });
});
