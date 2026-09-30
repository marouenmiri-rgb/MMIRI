import { describe, expect, it } from "vitest";
import { toApiSchema } from "@/lib/claude";

describe("toApiSchema", () => {
  it("removes constraints structured outputs reject and restates them", () => {
    const out = toApiSchema({
      type: "object",
      additionalProperties: false,
      required: ["panels", "n"],
      properties: {
        panels: {
          type: "array",
          minItems: 4,
          maxItems: 8,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["cast"],
            properties: {
              cast: { type: "array", minItems: 1, maxItems: 3, items: { type: "string", enum: ["a", "b"] } },
            },
          },
        },
        n: { type: "number", description: "Seconds.", minimum: 1, maximum: 5 },
      },
    }) as Record<string, any>;

    const json = JSON.stringify(out);
    expect(json).not.toMatch(/"(maxItems|minimum|maximum)":/);
    expect(out.properties.panels.minItems).toBe(1);
    expect(out.properties.panels.description).toBe("(at least 4 items, at most 8 items)");
    const cast = out.properties.panels.items.properties.cast;
    expect(cast.minItems).toBe(1);
    expect(cast.description).toBe("(at most 3 items)");
    expect(cast.items.enum).toEqual(["a", "b"]);
    expect(out.properties.n.description).toBe("Seconds. (minimum 1, maximum 5)");
    expect(out.required).toEqual(["panels", "n"]);
    expect(out.additionalProperties).toBe(false);
  });

  it("leaves a property literally named like a keyword alone", () => {
    const out = toApiSchema({
      type: "object",
      properties: { maxItems: { type: "number" } },
      required: ["maxItems"],
    }) as Record<string, any>;
    expect(out.properties.maxItems).toEqual({ type: "number" });
  });
});
