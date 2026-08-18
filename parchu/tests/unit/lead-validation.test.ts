import { describe, expect, it } from "vitest";
import { z } from "zod";

import { sellerLeadSchema } from "@/lib/validations/lead";

describe("sellerLeadSchema", () => {
  it("acepta un lead valido y normaliza espacios", () => {
    const result = sellerLeadSchema.safeParse({
      name: "  Ana Perez  ",
      whatsapp: " 300 000 0000 ",
      sells: " Postres ",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Ana Perez");
      expect(result.data.whatsapp).toBe("300 000 0000");
      expect(result.data.sells).toBe("Postres");
    }
  });

  it.each([
    ["name", { name: "", whatsapp: "3000000000", sells: "Postres" }],
    ["whatsapp", { name: "Ana", whatsapp: "", sells: "Postres" }],
    ["sells", { name: "Ana", whatsapp: "3000000000", sells: "" }],
  ])("rechaza cuando falta el campo %s", (field, input) => {
    const result = sellerLeadSchema.safeParse(input);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors).toHaveProperty(field);
    }
  });

  it("rechaza un whatsapp con letras", () => {
    const result = sellerLeadSchema.safeParse({
      name: "Ana",
      whatsapp: "no-es-un-numero",
      sells: "Postres",
    });

    expect(result.success).toBe(false);
  });
});
