import type {
  CustomField,
  Media,
  OptionType,
  OptionValue,
  PaginatedResponse,
  Product,
  ProductFiltersResponse,
  Variant,
} from "@spree/sdk";
import {
  canvasTote,
  category,
  featuredProducts,
  glassCarafe,
  linenOvershirt,
  oakTray,
  product,
  stonewareMug,
  stovetopKettle,
  tableLamp,
  usd,
  woolThrow,
} from "./catalog";

// The product list, category and product page fixtures. Invented, never real
// data; their shapes follow what Spree's Store API answers for the product
// page's fields (PRODUCT_PAGE_EXPAND) and the filters endpoint.

const colorType: OptionType = {
  id: "opt_Cl4rT8vn",
  name: "color",
  label: "Color",
  position: 1,
  kind: "color_swatch",
};

const sizeType: OptionType = {
  id: "opt_Sz7wQ2mk",
  name: "size",
  label: "Size",
  position: 2,
  kind: "buttons",
};

function optionValue(
  type: OptionType,
  fields: Pick<OptionValue, "id" | "name" | "label" | "position"> &
    Partial<OptionValue>,
): OptionValue {
  return {
    option_type_id: type.id,
    option_type_name: type.name,
    option_type_label: type.label,
    color_code: null,
    image_url: null,
    ...fields,
  };
}

const sage = optionValue(colorType, {
  id: "optval_Sg1pL5xa",
  name: "sage",
  label: "Sage",
  position: 1,
  color_code: "#9caf88",
});
const sand = optionValue(colorType, {
  id: "optval_Sn3kD8qe",
  name: "sand",
  label: "Sand",
  position: 2,
  color_code: "#d8c3a5",
});
// A colour saved without a code, which the picker shows as a grey swatch.
const slate = optionValue(colorType, {
  id: "optval_St6mW2rz",
  name: "slate",
  label: "Slate",
  position: 3,
});
const small = optionValue(sizeType, {
  id: "optval_Sm2nB7tu",
  name: "s",
  label: "S",
  position: 1,
});
const medium = optionValue(sizeType, {
  id: "optval_Md5jH4wo",
  name: "m",
  label: "M",
  position: 2,
});
const large = optionValue(sizeType, {
  id: "optval_Lg8cF1yi",
  name: "l",
  label: "L",
  position: 3,
});

function variant(
  id: string,
  sku: string,
  values: OptionValue[],
  fields: Partial<Variant> = {},
): Variant {
  return {
    id,
    product_id: linenOvershirt.id,
    sku,
    options_text: values
      .map((value) => `${value.option_type_label}: ${value.label}`)
      .join(", "),
    track_inventory: true,
    media_count: 0,
    preorder_ships_at: null,
    thumbnail_url: null,
    purchasable: true,
    in_stock: true,
    backorderable: false,
    preorder: false,
    weight: null,
    height: null,
    width: null,
    depth: null,
    weight_unit: "lb",
    dimensions_unit: "in",
    minimum_order_quantity: 1,
    order_multiple: 1,
    purchase_unit: "unit",
    units_per_carton: null,
    price: usd(`price_${id.slice(8)}`, "89.00"),
    original_price: null,
    seller_id: null,
    option_values: values,
    ...fields,
  };
}

const sageSmall = variant("variant_Sg1Sm2aa", "OVERSHIRT-SAGE-S", [
  sage,
  small,
]);
const sageMedium = variant("variant_Sg1Md5ab", "OVERSHIRT-SAGE-M", [
  sage,
  medium,
]);
const sageLarge = variant("variant_Sg1Lg8ac", "OVERSHIRT-SAGE-L", [
  sage,
  large,
]);
/** On sale: 69.00 instead of 89.00. */
const sandMedium = variant(
  "variant_Sn3Md5ad",
  "OVERSHIRT-SAND-M",
  [sand, medium],
  { price: usd("price_Sn3Md5ad", "69.00", "89.00") },
);
const sandSmall = variant("variant_Sn3Sm2ae", "OVERSHIRT-SAND-S", [
  sand,
  small,
]);
const slateSmall = variant("variant_St6Sm2af", "OVERSHIRT-SLATE-S", [
  slate,
  small,
]);
/** Sold out: it can be chosen but not added to the cart. */
const slateLarge = variant(
  "variant_St6Lg8ag",
  "OVERSHIRT-SLATE-L",
  [slate, large],
  { purchasable: false, in_stock: false },
);

function media(
  id: string,
  position: number,
  file: string,
  fields: Partial<Media> = {},
): Media {
  const url = `/fixtures/${file}`;
  return {
    id,
    product_id: linenOvershirt.id,
    variant_ids: [],
    position,
    alt: null,
    media_type: "image",
    external_video_url: null,
    focal_point_x: null,
    focal_point_y: null,
    video_provider: null,
    video_embed_url: null,
    video_url: null,
    poster_url: null,
    original_url: url,
    mini_url: url,
    small_url: url,
    medium_url: url,
    large_url: url,
    xlarge_url: url,
    og_image_url: url,
    ...fields,
  };
}

const overshirtMedia: Media[] = [
  media("media_Os1aSg9q", 1, "product-sand.png", {
    variant_ids: [sandSmall.id, sandMedium.id],
    alt: "Linen Overshirt in sand",
  }),
  media("media_Os2bSg9r", 2, "overshirt-sage.png", {
    variant_ids: [sageSmall.id, sageMedium.id, sageLarge.id],
    alt: "Linen Overshirt in sage",
  }),
  media("media_Os3cSt9s", 3, "overshirt-slate.png", {
    variant_ids: [slateSmall.id, slateLarge.id],
    alt: "Linen Overshirt in slate",
  }),
  media("media_Os4dCl9t", 4, "overshirt-detail.png", {
    alt: "A close-up of the overshirt's linen",
  }),
];

function customField(
  id: string,
  label: string,
  field_type: CustomField["field_type"],
  value: CustomField["value"],
): CustomField {
  return {
    id,
    label,
    field_type,
    key: `custom.${label.toLowerCase().replaceAll(" ", "_")}`,
    value,
  };
}

/** One field of each kind the product page renders. */
export const overshirtCustomFields: CustomField[] = [
  customField("cf_Mt1aRx4b", "Material", "short_text", "Washed linen"),
  customField(
    "cf_Cr2bRx4c",
    "Care",
    "long_text",
    "Machine wash cold with similar colours. Hang to dry and iron while damp.",
  ),
  customField("cf_Wt3cRx4d", "Weight", "number", 320),
  customField("cf_Mw4dRx4e", "Machine washable", "boolean", true),
  customField(
    "cf_Ft5eRx4f",
    "Fit",
    "rich_text",
    "<strong>Relaxed</strong> through the chest",
  ),
];

const apparel = category({
  id: "cat_Ap7wE3fh",
  name: "Apparel",
  permalink: "apparel",
  depth: 0,
  position: 3,
});

/** A subcategory with its parent, as the product page expands it. */
export const shirtsCategory = category({
  id: "cat_Sh2tK9pd",
  name: "Shirts",
  permalink: "apparel/shirts",
  depth: 1,
  parent_id: apparel.id,
  ancestors: [apparel],
});

const overshirtVariants = [
  sandSmall,
  sandMedium,
  sageSmall,
  sageMedium,
  sageLarge,
  slateSmall,
  slateLarge,
];

/**
 * Colour and size, several pictures with one per colour, a variant on sale,
 * a sold-out variant and a custom field of each kind.
 */
export const overshirtProduct = product({
  ...linenOvershirt,
  description:
    "A light overshirt in washed linen, cut to wear open over a T-shirt.",
  description_html:
    "<p>A light overshirt in washed linen, cut to wear open over a T-shirt.</p><p>Two chest pockets and horn buttons.</p>",
  variant_count: overshirtVariants.length,
  default_variant_id: sandSmall.id,
  default_variant: sandSmall,
  variants: overshirtVariants,
  option_types: [colorType, sizeType],
  media: overshirtMedia,
  custom_fields: overshirtCustomFields,
  categories: [shirtsCategory],
});

/** The overshirt opened on its sale variant. */
export const overshirtOnSale = product({
  ...overshirtProduct,
  default_variant: sandMedium,
});

/** The overshirt opened on its sold-out variant. */
export const overshirtSoldOutChoice = product({
  ...overshirtProduct,
  default_variant: slateLarge,
});

/** No options, one picture and no custom fields. */
export const mugProduct = product({
  ...stonewareMug,
  description_html: "<p>A wheel-thrown mug that holds 350 millilitres.</p>",
  default_variant: variant("variant_Mg4tR8wq", "MUG-STONEWARE", [], {
    product_id: stonewareMug.id,
    price: usd("price_Mg4tR8wq", "18.00"),
  }),
  variants: [],
  option_types: [],
  media: [
    media("media_Mg1aCl8z", 1, "product-clay.png", {
      product_id: stonewareMug.id,
    }),
  ],
  custom_fields: [],
});

/** No options and no picture. */
export const trayProduct = product({
  ...oakTray,
  default_variant: variant("variant_Ot6jD3ky", "TRAY-OAK", [], {
    product_id: oakTray.id,
    price: usd("price_Ot6jD3ky", "38.00"),
  }),
  variants: [],
  option_types: [],
  media: [],
  custom_fields: [],
});

/** The overshirt with its prices withheld, as a store that hides prices sends it to a guest. */
export const overshirtPriceWithheld = product({
  ...overshirtProduct,
  price: { ...overshirtProduct.price, amount: null, display_amount: null },
  default_variant: {
    ...sandSmall,
    price: { ...sandSmall.price, amount: null, display_amount: null },
  },
  variants: overshirtVariants.map((entry) => ({
    ...entry,
    price: { ...entry.price, amount: null, display_amount: null },
    original_price: null,
  })),
});

/** Twelve products, the first page of a listing. */
export const firstPageOfProducts: Product[] = [
  ...featuredProducts,
  product({
    id: "prod_Cb9rN4xs",
    name: "Linen Camp Shirt",
    slug: "linen-camp-shirt",
    price: usd("price_Cb9rN4xs", "72.00"),
    thumbnail_url: "/fixtures/overshirt-sage.png",
  }),
  product({
    id: "prod_Pt3vM7lq",
    name: "Copper Pour-Over Kettle",
    slug: "copper-pour-over-kettle",
    price: usd("price_Pt3vM7lq", "58.00"),
    thumbnail_url: "/fixtures/product-ochre.png",
  }),
  product({
    id: "prod_Cn6bX2wd",
    name: "Brass Desk Lamp",
    slug: "brass-desk-lamp",
    price: usd("price_Cn6bX2wd", "110.00"),
    thumbnail_url: "/fixtures/product-sage.png",
  }),
  product({
    id: "prod_Bk5gT8je",
    name: "Waxed Canvas Tote",
    slug: "waxed-canvas-tote",
    price: usd("price_Bk5gT8je", "48.00"),
    thumbnail_url: "/fixtures/product-slate.png",
  }),
];

/** The second page, which loading more adds. */
export const secondPageOfProducts: Product[] = [
  product({
    id: "prod_Rg4hY1cv",
    name: "Linen Work Shirt",
    slug: "linen-work-shirt",
    price: usd("price_Rg4hY1cv", "95.00"),
    thumbnail_url: "/fixtures/overshirt-slate.png",
  }),
  product({
    id: "prod_Vs8kP3bn",
    name: "Stoneware Espresso Cup",
    slug: "stoneware-espresso-cup",
    price: usd("price_Vs8kP3bn", "14.00", "18.00"),
    thumbnail_url: "/fixtures/product-clay.png",
  }),
];

/** The products a search for "linen" finds. */
export const linenSearchResults: Product[] = [
  linenOvershirt,
  tableLamp,
  product({
    id: "prod_Nk2qW6fh",
    name: "Linen Napkins, Set of Four",
    slug: "linen-napkins",
    price: usd("price_Nk2qW6fh", "28.00"),
    thumbnail_url: "/fixtures/overshirt-detail.png",
  }),
];

/** The products the category lists. */
export const tablewareProducts: Product[] = [
  stonewareMug,
  glassCarafe,
  oakTray,
  canvasTote,
  stovetopKettle,
  woolThrow,
];

/** A page of a listing, with the totals Spree's pagination answers with. */
export function productPage(
  products: Product[],
  { page = 1, pages = 1, count = products.length } = {},
): PaginatedResponse<Product> {
  const limit = 12;
  const from = products.length > 0 ? (page - 1) * limit + 1 : 0;
  return {
    data: products,
    meta: {
      page,
      limit,
      count,
      pages,
      from,
      to: from + products.length - (products.length > 0 ? 1 : 0),
      in: products.length,
      previous: page > 1 ? page - 1 : null,
      next: page < pages ? page + 1 : null,
    },
  };
}

/**
 * What the filters endpoint answers for a listing: a price range, stock, two
 * options and the sort orders. For the whole catalogue Spree answers `id`
 * with null, which the SDK's type and schema do not allow, so the fixture
 * carries an empty string.
 */
export const listingFilters: ProductFiltersResponse = {
  id: "",
  default_sort: "manual",
  total_count: 14,
  filters: [
    {
      id: "price",
      type: "price_range",
      min: "12.00",
      max: "120.00",
      currency: "USD",
    },
    {
      id: "availability",
      type: "availability",
      options: [
        { id: "in_stock", count: 13 },
        { id: "out_of_stock", count: 1 },
      ],
    },
    {
      id: colorType.id,
      type: "option",
      name: colorType.name,
      label: colorType.label,
      kind: colorType.kind,
      options: [sage, sand, slate].map((value, index) => ({
        id: value.id,
        name: value.name,
        label: value.label,
        position: value.position,
        color_code: value.color_code,
        image_url: null,
        count: [5, 3, 2][index],
      })),
    },
    {
      id: sizeType.id,
      type: "option",
      name: sizeType.name,
      label: sizeType.label,
      kind: sizeType.kind,
      options: [small, medium, large].map((value, index) => ({
        id: value.id,
        name: value.name,
        label: value.label,
        position: value.position,
        color_code: null,
        image_url: null,
        count: [3, 3, 2][index],
      })),
    },
  ],
  sort_options: [
    "manual",
    "best_selling",
    "price",
    "-price",
    "-available_on",
    "available_on",
    "name",
    "-name",
  ].map((id) => ({ id, label: null })),
};

/** The option values a story picks, by name. */
export const filterChoices = {
  sage: sage.id,
  sand: sand.id,
  medium: medium.id,
};

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
const kitchen = category({
  id: "cat_Kc2vB7ln",
  name: "Kitchen",
  permalink: "kitchen",
  depth: 0,
});

/** A category with a picture, a description, subcategories and its parent. */
export const tablewareCategory = category({
  id: "cat_Tw8nR2qe",
  name: "Tableware",
  permalink: "kitchen/tableware",
  depth: 1,
  parent_id: kitchen.id,
  description: "Plates, cups and serving pieces for every day.",
  description_html: "<p>Plates, cups and serving pieces for every day.</p>",
  image_url: "/fixtures/product-clay.png",
  ancestors: [kitchen],
  children: [drinkware, serveware],
});

/** The same category without a picture or description. */
export const tablewareWithoutPicture = category({
  ...tablewareCategory,
  description: "",
  description_html: "",
  image_url: null,
});

/** A subcategory two levels down, without children of its own. */
export const drinkwareCategory = category({
  ...drinkware,
  ancestors: [kitchen, tablewareCategory],
});

/** A root category, which has no parent in the breadcrumb. */
export const kitchenCategory = category({
  ...kitchen,
  children: [tablewareCategory],
});

/** A category whose names are long enough to run past a phone's width. */
export const longCategory = category({
  id: "cat_Lg9xQ3hb",
  name: "Hand-Thrown Stoneware Serving Bowls",
  permalink: "kitchen/tableware/hand-thrown-stoneware-serving-bowls",
  depth: 2,
  parent_id: tablewareCategory.id,
  ancestors: [kitchen, tablewareCategory],
});
