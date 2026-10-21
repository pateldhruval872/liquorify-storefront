import { CartSchema, MarketSchema } from "@spree/sdk/zod";
import { describe, expect, it } from "vitest";
import { cartWithItems, emptyCart } from "./cart";
import { unitedStates } from "./markets";

// A fixture that no longer parses means the API changed and the mock now shows
// something Spree would not (LIQ-010 §7.4).
interface Schema {
  safeParse(value: unknown): { error?: { issues: unknown[] } };
}

const fixtures: [string, Schema, unknown[]][] = [
  ["carts", CartSchema, [cartWithItems, emptyCart]],
  ["markets", MarketSchema, [unitedStates]],
];

describe("fixtures match the SDK schemas", () => {
  it.each(fixtures)("%s", (_name, schema, records) => {
    for (const record of records) {
      expect(schema.safeParse(record).error?.issues ?? []).toEqual([]);
    }
  });
});
