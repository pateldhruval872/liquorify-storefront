import type { Category, Price, Product } from "@spree/sdk";

function usd(
  id: string,
  amount: string,
  compareAt: string | null = null,
): Price {
  return {
    id,
    currency: "USD",
    amount,
    compare_at_amount: compareAt,
    amount_in_cents: Math.round(Number(amount) * 100),
    compare_at_amount_in_cents: compareAt
      ? Math.round(Number(compareAt) * 100)
      : null,
    display_amount: `$${amount}`,
    display_compare_at_amount: compareAt ? `$${compareAt}` : null,
    price_list_id: null,
  };
}

/** A product as the card and search fields ask for it. Invented, never real data. */
function product(
  fields: Partial<Product> & Pick<Product, "id" | "name" | "slug" | "price">,
): Product {
  return {
    meta_title: null,
    meta_description: null,
    meta_keywords: null,
    variant_count: 1,
    available_on: "2026-01-05T00:00:00.000Z",
    preorder_ships_at: null,
    purchasable: true,
    preorder: false,
    in_stock: true,
    backorderable: false,
    available: true,
    description: null,
    description_html: null,
    default_variant_id: `variant_${fields.id.slice(5)}`,
    buy_box_variant_id: null,
    thumbnail_url: null,
    tags: [],
    original_price: null,
    seller_id: null,
    ...fields,
  };
}

export const stonewareMug = product({
  id: "prod_Mg4tR8wq",
  name: "Stoneware Mug",
  slug: "stoneware-mug",
  price: usd("price_Mg4tR8wq", "18.00"),
  thumbnail_url: "/fixtures/product-clay.png",
});

export const tableLamp = product({
  id: "prod_Lp7xK2va",
  name: "Linen Shade Table Lamp",
  slug: "linen-shade-table-lamp",
  price: usd("price_Lp7xK2va", "64.00", "80.00"),
  thumbnail_url: "/fixtures/product-sage.png",
});

export const canvasTote = product({
  id: "prod_Tb3nW9cs",
  name: "Canvas Market Tote",
  slug: "canvas-market-tote",
  price: usd("price_Tb3nW9cs", "32.00"),
  thumbnail_url: "/fixtures/product-slate.png",
});

export const stovetopKettle = product({
  id: "prod_Kt5pQ1ze",
  name: "Enamel Stovetop Kettle",
  slug: "enamel-stovetop-kettle",
  price: usd("price_Kt5pQ1ze", "45.00"),
  thumbnail_url: "/fixtures/product-ochre.png",
  purchasable: false,
  in_stock: false,
  available: false,
});

export const linenOvershirt = product({
  id: "prod_Os2hV6nb",
  name: "Linen Overshirt",
  slug: "linen-overshirt",
  price: usd("price_Os2hV6nb", "89.00"),
  thumbnail_url: "/fixtures/product-sand.png",
});

export const woolThrow = product({
  id: "prod_Wt8mC4ra",
  name: "Herringbone Wool Throw Blanket in a Generous Oversized Cut",
  slug: "herringbone-wool-throw",
  price: usd("price_Wt8mC4ra", "120.00"),
});

export const oakTray = product({
  id: "prod_Ot6jD3ky",
  name: "Oak Serving Tray",
  slug: "oak-serving-tray",
  price: usd("price_Ot6jD3ky", "38.00"),
});

export const glassCarafe = product({
  id: "prod_Gc1fL7ux",
  name: "Glass Carafe",
  slug: "glass-carafe",
  price: usd("price_Gc1fL7ux", "26.00", "34.00"),
});

/** Eight products, the number the home page features. */
export const featuredProducts = [
  stonewareMug,
  tableLamp,
  canvasTote,
  stovetopKettle,
  linenOvershirt,
  woolThrow,
  oakTray,
  glassCarafe,
];

/** A product whose price is withheld, as a channel that hides prices sends it. */
export const productWithHiddenPrice = product({
  ...canvasTote,
  price: { ...canvasTote.price, amount: null, display_amount: null },
});

function category(
  fields: Partial<Category> &
    Pick<Category, "id" | "name" | "permalink" | "depth">,
): Category {
  const children = fields.children ?? [];
  return {
    position: 1,
    meta_title: null,
    meta_description: null,
    meta_keywords: null,
    children_count: children.length,
    parent_id: null,
    description: "",
    description_html: "",
    image_url: null,
    square_image_url: null,
    is_root: fields.depth === 0,
    is_child: fields.depth > 0,
    is_leaf: children.length === 0,
    ...fields,
    children,
  };
}

const drinkware = category({
  id: "cat_Dw3kP9za",
  name: "Drinkware",
  permalink: "kitchen/tableware/drinkware",
  depth: 2,
  parent_id: "cat_Tw8nR2qe",
});
const serveware = category({
  id: "cat_Sw5mH1xo",
  name: "Serveware",
  permalink: "kitchen/tableware/serveware",
  depth: 2,
  parent_id: "cat_Tw8nR2qe",
});
const tableware = category({
  id: "cat_Tw8nR2qe",
  name: "Tableware",
  permalink: "kitchen/tableware",
  depth: 1,
  parent_id: "cat_Kc2vB7ln",
  children: [drinkware, serveware],
});
const cookware = category({
  id: "cat_Cw6tJ4ds",
  name: "Cookware",
  permalink: "kitchen/cookware",
  depth: 1,
  parent_id: "cat_Kc2vB7ln",
});
const lighting = category({
  id: "cat_Lt9gF5wu",
  name: "Lighting",
  permalink: "home/lighting",
  depth: 1,
  parent_id: "cat_Hm4yN8ci",
});
const textiles = category({
  id: "cat_Tx2qS6pm",
  name: "Textiles",
  permalink: "home/textiles",
  depth: 1,
  parent_id: "cat_Hm4yN8ci",
});

/**
 * The root categories with two levels of children, as the storefront layout
 * asks for them for the header's menu and the footer.
 */
export const rootCategories = [
  category({
    id: "cat_Kc2vB7ln",
    name: "Kitchen",
    permalink: "kitchen",
    depth: 0,
    children: [tableware, cookware],
  }),
  category({
    id: "cat_Hm4yN8ci",
    name: "Home",
    permalink: "home",
    depth: 0,
    position: 2,
    children: [lighting, textiles],
  }),
  category({
    id: "cat_Ap7wE3fh",
    name: "Apparel",
    permalink: "apparel",
    depth: 0,
    position: 3,
  }),
];
