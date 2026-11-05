import type { Address, Cart, Country } from "@spree/sdk";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "@/contexts/AuthContext";
import { AddressSection } from "../AddressSection";

vi.mock("next-intl", async () => {
  const actual = await vi.importActual("next-intl");
  return {
    ...actual,
    useLocale: () => "en",
    useTranslations: () => (key: string) => key,
  };
});

const cart = {
  id: "cart_1",
  email: null,
  shipping_address: null,
} as unknown as Cart;

const countries = [{ iso: "US", name: "United States" }] as Country[];

const savedAddress = {
  id: "addr_1",
  first_name: "Ada",
  last_name: "Lovelace",
  full_name: "Ada Lovelace",
  address1: "12 Difference Engine Row",
  address2: null,
  city: "New York",
  postal_code: "10001",
  phone: null,
  company: null,
  country_code: "US",
  country_name: "United States",
  state_code: "NY",
  state_name: null,
  state_text: "NY",
} as unknown as Address;

const account: User = {
  id: "cus_1",
  email: "ada@example.com",
  first_name: "Ada",
  last_name: "Lovelace",
};

const onAutoSave = vi.fn().mockResolvedValue(undefined);

function renderSection({
  user,
  isAuthenticated = true,
  savedAddresses = [savedAddress],
}: {
  user: User | null;
  isAuthenticated?: boolean;
  savedAddresses?: Address[];
}) {
  return (
    <AddressSection
      cart={cart}
      countries={countries}
      savedAddresses={savedAddresses}
      isAuthenticated={isAuthenticated}
      signInUrl="/us/en/account"
      fetchStates={vi.fn().mockResolvedValue([])}
      onEmailBlur={vi.fn().mockResolvedValue(undefined)}
      onAutoSave={onAutoSave}
      user={user}
    />
  );
}

describe("AddressSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the account email once the account loads after checkout renders", async () => {
    const { rerender } = render(renderSection({ user: null }));

    const emailField = screen.getByPlaceholderText("emailAddress");
    expect(emailField).toHaveValue("");
    expect(emailField).toBeEnabled();
    expect(onAutoSave).not.toHaveBeenCalled();

    rerender(renderSection({ user: account }));

    expect(emailField).toHaveValue("ada@example.com");
    expect(emailField).toBeDisabled();
    await waitFor(() =>
      expect(onAutoSave).toHaveBeenCalledWith({
        email: "ada@example.com",
        shipping_address_id: "addr_1",
      }),
    );
    expect(onAutoSave).toHaveBeenCalledTimes(1);
  });

  it("lets a signed-in customer type an email while their account has not loaded", () => {
    render(renderSection({ user: null }));

    const emailField = screen.getByPlaceholderText("emailAddress");
    fireEvent.change(emailField, { target: { value: "typed@example.com" } });

    expect(emailField).toHaveValue("typed@example.com");
    expect(emailField).toBeEnabled();
  });

  it("lets a guest type their email", () => {
    render(
      renderSection({ user: null, isAuthenticated: false, savedAddresses: [] }),
    );

    const emailField = screen.getByPlaceholderText("emailAddress");
    fireEvent.change(emailField, { target: { value: "guest@example.com" } });

    expect(emailField).toHaveValue("guest@example.com");
    expect(emailField).toBeEnabled();
  });
});
