import { readFileSync } from "node:fs";

export type OrderState =
  | "shipped"
  | "partially-shipped"
  | "unfulfilled"
  | "canceled"
  | "no-tracking"
  | "paid-by-saved-card";

/**
 * The test customer the account screens are opened as, read from the JSON file
 * `FIDELITY_ACCOUNTS` names. It holds a password, so it stays outside the
 * repository. The orders are the customer's, by ID, one in each state; the
 * other order belongs to another customer.
 */
export interface Accounts {
  customer: { email: string; password: string };
  orders: Record<OrderState, string>;
  anotherCustomersOrder: string;
  resetToken?: string;
}

export function readAccounts(): Accounts {
  const file = process.env.FIDELITY_ACCOUNTS;
  if (!file) throw new Error("Set FIDELITY_ACCOUNTS (see screens.spec.ts).");
  return JSON.parse(readFileSync(file, "utf8"));
}
