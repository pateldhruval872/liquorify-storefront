import { createTranslator } from "next-intl";
import { getTranslations } from "next-intl/server";
import { mocked } from "storybook/test";
import messages from "../../messages/en.json";
import { getCart } from "../../src/lib/data/cart";
import { syncSession } from "../../src/lib/data/customer";
import { FIXTURE_NOW } from "../fixtures/clock";

/** What a story asks of the replaced server actions, through `parameters.liquorify`. */
export interface ServerActionNeeds {
  /** The cart `getCart` returns; "loading" never resolves. Defaults to no cart. */
  cart?: Awaited<ReturnType<typeof getCart>> | "loading";
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
  mocked(syncSession).mockResolvedValue({
    customer: null,
    refreshed: false,
    stale: false,
  });

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
