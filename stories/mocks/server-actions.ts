import type { Address, Country, Customer } from "@spree/sdk";
import { createTranslator } from "next-intl";
import { getTranslations } from "next-intl/server";
import { mocked } from "storybook/test";
import messages from "../../messages/en.json";
import {
  createAddress,
  deleteAddress,
  updateAddress,
} from "../../src/lib/data/addresses";
import { getCart } from "../../src/lib/data/cart";
import { getCountry } from "../../src/lib/data/countries";
import { deleteCreditCard } from "../../src/lib/data/credit-cards";
import { syncSession } from "../../src/lib/data/customer";
import { FIXTURE_NOW } from "../fixtures/clock";

/** What a story asks of the replaced server actions, through `parameters.liquorify`. */
export interface ServerActionNeeds {
  /** The cart `getCart` returns; "loading" never resolves. Defaults to no cart. */
  cart?: Awaited<ReturnType<typeof getCart>> | "loading";
  /** The signed-in customer `syncSession` returns; "loading" never resolves. Defaults to a guest. */
  customer?: Customer | null | "loading";
  /** The countries `getCountry` answers with, states included. */
  countries?: Country[];
  /** Makes saving, deleting and removing fail with this message, as the API's refusal would. */
  failWith?: string;
}

/**
 * Gives the modules replaced in preview.tsx their answers for one story. The
 * real providers run on top of them, so no request reaches a Spree server.
 */
export function mockServerActions(needs: ServerActionNeeds) {
  if (needs.cart === "loading") {
    mocked(getCart).mockReturnValue(new Promise(() => {}));
  } else {
    mocked(getCart).mockResolvedValue(needs.cart ?? null);
  }
  if (needs.customer === "loading") {
    mocked(syncSession).mockReturnValue(new Promise(() => {}));
  } else {
    mocked(syncSession).mockResolvedValue({
      customer: needs.customer ?? null,
      refreshed: false,
      stale: false,
    });
  }

  // The address editor treats a country it cannot load as one without states.
  mocked(getCountry).mockImplementation(async (iso: string) => {
    const country = needs.countries?.find((entry) => entry.iso === iso);
    if (!country) throw new Error(`No fixture for the country ${iso}`);
    return country;
  });

  // Writes answer as the API would, echoing what was sent, unless the story
  // asks for a refusal.
  const refusal = needs.failWith
    ? { success: false as const, error: needs.failWith }
    : null;
  mocked(createAddress).mockImplementation(
    async (params) =>
      refusal ?? {
        success: true,
        address: savedAddress("addr_new", params),
      },
  );
  mocked(updateAddress).mockImplementation(
    async (id, params) =>
      refusal ?? { success: true, address: savedAddress(id, params) },
  );
  mocked(deleteAddress).mockResolvedValue(refusal ?? { success: true });
  mocked(deleteCreditCard).mockResolvedValue(refusal ?? { success: true });

  // Server components read translations through next-intl/server, which
  // only runs on the server, so it answers from the same English messages.
  mocked(getTranslations).mockImplementation((async (
    options?: string | { namespace?: string },
  ) => {
    const namespace =
      typeof options === "string" ? options : options?.namespace;
    return createTranslator({
      locale: "en",
      messages,
      now: new Date(FIXTURE_NOW),
      timeZone: "UTC",
      namespace: namespace as never,
    });
  }) as unknown as typeof getTranslations);
}

function savedAddress(
  id: string,
  params: Parameters<typeof updateAddress>[1],
): Address {
  return {
    id,
    label: null,
    first_name: params.first_name ?? null,
    last_name: params.last_name ?? null,
    full_name: [params.first_name, params.last_name].filter(Boolean).join(" "),
    address1: params.address1 ?? null,
    address2: params.address2 ?? null,
    postal_code: params.postal_code ?? null,
    city: params.city ?? null,
    phone: params.phone ?? null,
    company: params.company ?? null,
    country_name: params.country_code ?? "",
    country_code: params.country_code ?? "US",
    country_iso: params.country_code ?? "US",
    state_text: params.state_code ?? params.state_name ?? null,
    state_code: params.state_code ?? null,
    state_abbr: params.state_code ?? null,
    state_name: params.state_name ?? null,
    quick_checkout: false,
    is_default_billing: false,
    is_default_shipping: false,
  };
}
