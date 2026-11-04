import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { CheckoutPageContent } from "../../src/app/[country]/[locale]/(checkout)/checkout/[id]/CheckoutPageContent";
import CheckoutLayout from "../../src/app/[country]/[locale]/(checkout)/layout";
import { customer } from "../fixtures/account";
import { emptyCart } from "../fixtures/cart";
import {
  addressedCart,
  checkoutCountries,
  deliveryRequirement,
  newCheckoutCart,
  savedAddresses,
} from "../fixtures/checkout";

const cartId = newCheckoutCart.id;

/** The checkout page as the checkout layout frames it, with the summary beside it. */
function CheckoutPage(props: Parameters<typeof CheckoutPageContent>[0]) {
  return (
    <CheckoutLayout>
      <CheckoutPageContent {...props} />
    </CheckoutLayout>
  );
}

const guestData = (cart = newCheckoutCart) => ({
  cart,
  countries: checkoutCountries,
  savedAddresses: [],
  isAuthenticated: false,
});

/**
 * Checkout: contact and shipping address, delivery, payment and, for a
 * guest, the store's policies, with the order summary and the code field
 * beside it, or behind "Show order summary" on a phone. The page opens with
 * what the server loaded; without it, it loads the cart itself. The express
 * checkout buttons show nothing here, as on a storefront without a Stripe key.
 */
const meta = {
  title: "Storefront/Pages/Checkout page content",
  component: CheckoutPage,
  tags: ["CMP-SF-PG-01"],
  args: { cartId, urlCountry: "us", initialData: guestData() },
  parameters: {
    layout: "fullscreen",
    nextjs: { navigation: { pathname: `/us/en/checkout/${cartId}` } },
    liquorify: {
      storefront: true,
      cart: newCheckoutCart,
      countries: checkoutCountries,
    },
  },
} satisfies Meta<typeof CheckoutPage>;

export default meta;
type Story = StoryObj<typeof meta>;

const page = (canvasElement: HTMLElement) => within(canvasElement);

/**
 * Ticks the policies and presses "Place Order". Pressing scrolls the page, so
 * stories that press it scroll back up before the capture, or the summary,
 * which sticks to the top of the window, is drawn part way down.
 */
async function agreeAndPlace(canvasElement: HTMLElement) {
  const canvas = page(canvasElement);
  await userEvent.click(canvas.getByRole("checkbox", { name: /I agree/ }));
  await userEvent.click(canvas.getByRole("button", { name: "Place Order" }));
}

/** Opened without the server's data, while it loads the cart. */
export const Loading: Story = {
  args: { initialData: null },
  parameters: { liquorify: { checkoutCart: "loading" } },
};

export const FailedToLoad: Story = {
  name: "Failed to load",
  args: { initialData: null },
  parameters: { liquorify: { checkoutCart: "error" } },
  play: async ({ canvasElement }) => {
    await page(canvasElement).findByText(
      "Failed to load checkout. Please try again.",
    );
  },
};

/** Spree does not find the cart, or it belongs to someone else. */
export const NotFound: Story = {
  name: "Not found",
  args: { initialData: null },
  parameters: { liquorify: { checkoutCart: null } },
  play: async ({ canvasElement }) => {
    await page(canvasElement).findByText(
      "Order not found or you don't have access to it.",
    );
  },
};

const emptyCheckoutCart = { ...emptyCart, id: cartId, number: cartId };

export const EmptyCart: Story = {
  name: "Empty cart",
  args: { initialData: guestData(emptyCheckoutCart) },
  parameters: { liquorify: { cart: emptyCheckoutCart } },
};

/** A guest on arrival: nothing entered, so no delivery rates yet. */
export const GuestArriving: Story = {
  name: "Guest arriving",
  play: async ({ canvasElement }) => {
    await page(canvasElement).findByRole("option", { name: "New York" });
  },
};

/** The address saved, a rate chosen and Check offered. */
export const GuestReadyToPlace: Story = {
  name: "Guest ready to place the order",
  args: { initialData: guestData(addressedCart) },
  parameters: { liquorify: { storefront: true, cart: addressedCart } },
  play: async ({ canvasElement }) => {
    await page(canvasElement).findByRole("option", { name: "New York" });
  },
};

const signedInCart = { ...newCheckoutCart, email: customer.email };

/**
 * The first saved address is chosen and saved to the cart, which answers
 * with its rates and Check; customers accepted the policies when they
 * registered.
 */
export const SignedInWithSavedAddresses: Story = {
  name: "Signed in, saved addresses",
  args: {
    initialData: {
      cart: signedInCart,
      countries: checkoutCountries,
      savedAddresses,
      isAuthenticated: true,
    },
  },
  parameters: {
    liquorify: {
      storefront: true,
      cart: signedInCart,
      checkoutCart: {
        ...addressedCart,
        email: customer.email,
        shipping_address: savedAddresses[0],
      },
      customer,
    },
  },
  play: async ({ canvasElement }) => {
    await page(canvasElement).findByText("Using your account email address", {
      exact: false,
    });
  },
};

export const PolicyConsentRequired: Story = {
  name: "Policy consent required",
  args: { initialData: guestData(addressedCart) },
  parameters: { liquorify: { storefront: true, cart: addressedCart } },
  play: async ({ canvasElement }) => {
    const canvas = page(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Place Order" }));
    await canvas.findByText(
      "You must agree to the store policies before placing your order",
    );
    window.scrollTo(0, 0);
  },
};

/** "Place Order" found the email, the address and the delivery rate missing. */
export const RequirementsUnmet: Story = {
  name: "Requirements unmet",
  play: async ({ canvasElement }) => {
    await agreeAndPlace(canvasElement);
    await page(canvasElement).findByText(deliveryRequirement.message);
    window.scrollTo(0, 0);
  },
};

export const PlacingTheOrder: Story = {
  name: "Placing the order",
  args: { initialData: guestData(addressedCart) },
  parameters: {
    liquorify: { storefront: true, cart: addressedCart, holdWrites: true },
  },
  play: async ({ canvasElement }) => {
    await agreeAndPlace(canvasElement);
    await expect(
      await page(canvasElement).findByRole("button", { name: "Processing..." }),
    ).toBeDisabled();
    window.scrollTo(0, 0);
  },
};

/** The payment was taken but Spree refused to complete the order; the message is Spree's. */
export const OrderRefused: Story = {
  name: "Order refused",
  args: { initialData: guestData(addressedCart) },
  parameters: {
    liquorify: {
      storefront: true,
      cart: addressedCart,
      completionFailsWith: "Item Linen Overshirt is out of stock",
    },
  },
  play: async ({ canvasElement }) => {
    await agreeAndPlace(canvasElement);
    await page(canvasElement).findByText(
      "Item Linen Overshirt is out of stock",
    );
    window.scrollTo(0, 0);
  },
};

/** Back from a provider's extra check that failed: the confirm payment page sends its error in the address. */
export const PaymentErrorReturned: Story = {
  name: "Payment error returned",
  args: { initialData: guestData(addressedCart) },
  parameters: {
    nextjs: {
      navigation: {
        pathname: `/us/en/checkout/${cartId}`,
        query: { payment_error: "Your card was declined." },
      },
    },
    liquorify: { storefront: true, cart: addressedCart },
  },
  play: async ({ canvasElement }) => {
    await page(canvasElement).findByText("Your card was declined.");
  },
};
