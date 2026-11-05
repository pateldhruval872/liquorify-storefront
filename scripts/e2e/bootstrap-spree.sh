#!/usr/bin/env bash
# Bootstrap the E2E Spree backend that scripts/e2e/liquorify-backend.sh
# starts from the recorded Liquorify revision.
#
# Steps:
#   1. `db:seed` — seed the default store, roles, countries.
#   2. `spree:load_sample_data` — load sample products, categories, images.
#   3. show Spree's Check payment method at checkout, after Stripe.
#   4. add a product that has both color and size options.
#   5. add checkout's test data: two gift cards, a taxed product and a
#      market in euros.
#   6. mint a publishable API key bound to a public channel, and capture
#      its pk_… token.
#
# Idempotent: the seed and sample-data tasks are no-ops on already-seeded
# databases, and the API key step reuses a correctly-bound "E2E" key when one
# already exists.
#
# Output: writes `.env.e2e` at the repo root with SPREE_API_URL +
# SPREE_PUBLISHABLE_KEY for the storefront to consume.

set -euo pipefail

readonly REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
readonly ENV_FILE="$REPO_ROOT/.env.e2e"
readonly SPREE_URL="http://localhost:4000"

# shellcheck source=liquorify-backend.sh
source "$REPO_ROOT/scripts/e2e/liquorify-backend.sh"

# Runs a Ruby script read from stdin in the backend's Rails app, passing the
# Stripe keys through the environment rather than the script text.
rails_runner() {
  (cd "$HOST_APP_DIR" && bin/rails runner -)
}

rails_task() {
  (cd "$HOST_APP_DIR" && bin/rails "$1")
}

# Stripe test-mode API keys. Both must come from the SAME Stripe sandbox
# account — a mismatched pair makes Stripe.js fail to confirm the
# PaymentIntent during checkout. Stripe no longer publishes a working
# sample pair (the old docs sk_test_… key is expired), so use keys from
# your own Stripe sandbox:
#
#   export STRIPE_PUBLISHABLE_KEY=pk_test_…
#   export STRIPE_SECRET_KEY=sk_test_…
#   pnpm run e2e:up
#
# The secret key is never committed: GitHub's push protection flags any
# sk_test_ literal as a secret regardless of provenance. In CI,
# STRIPE_SECRET_KEY is a repository secret and STRIPE_PUBLISHABLE_KEY a
# repository variable, both injected via the workflow env (see
# .github/workflows/ci.yml).
if [[ -z "${STRIPE_PUBLISHABLE_KEY:-}" || -z "${STRIPE_SECRET_KEY:-}" ]]; then
  echo "STRIPE_PUBLISHABLE_KEY and STRIPE_SECRET_KEY must both be set." >&2
  echo "Use a pk_test_…/sk_test_… pair from your own Stripe sandbox." >&2
  echo "See script header for details." >&2
  exit 1
fi

# Full-shape checks (not just prefix): a stray quote, space, or other
# copy-paste artifact would otherwise flow into .env.e2e and break parsing.
if [[ ! "$STRIPE_PUBLISHABLE_KEY" =~ ^pk_test_[A-Za-z0-9_]+$ ]]; then
  echo "STRIPE_PUBLISHABLE_KEY must be a test-mode key (pk_test_…)." >&2
  echo "Got: ${STRIPE_PUBLISHABLE_KEY:0:8}…" >&2
  exit 1
fi

if [[ ! "$STRIPE_SECRET_KEY" =~ ^sk_test_[A-Za-z0-9_]+$ ]]; then
  echo "STRIPE_SECRET_KEY must be a test-mode key (sk_test_…)." >&2
  echo "Got: ${STRIPE_SECRET_KEY:0:8}…" >&2
  exit 1
fi

# Both callers (`pnpm run e2e:up` and CI) start the backend and wait for
# it first; this guard only covers running the script standalone against a
# still-booting backend.
echo "==> Waiting for Spree to accept HTTP requests at $SPREE_URL/up"
if ! curl -fsS --retry 60 --retry-delay 2 --retry-all-errors "$SPREE_URL/up" >/dev/null 2>&1; then
  echo "Spree never came up. Check the backend's log." >&2
  exit 1
fi

echo "==> Seeding default Spree data (db:seed)"
rails_task db:seed

echo "==> Loading sample products and categories (spree:load_sample_data)"
rails_task spree:load_sample_data

# The backend includes the Stripe integration (spree_stripe), so
# SpreeStripe::Gateway is available — but no gateway row is seeded, since that
# carries account-specific API keys. We create one with a `bin/rails runner`
# snippet that writes the row directly with the E2E test keys. The script is
# idempotent: re-running matches the existing row by name
# (where(...).first_or_initialize) and reapplies the same attributes.
# The keys reach Ruby through this script's environment rather than heredoc
# interpolation, so the Ruby source never embeds them — the heredoc
# delimiter is quoted on purpose.
echo "==> Configuring Stripe payment gateway on the default store"
rails_runner <<'RUBY'
store = Spree::Store.default
gateway = Spree::PaymentMethod.where(type: 'SpreeStripe::Gateway', name: 'E2E Stripe', store: store).first_or_initialize
gateway.assign_attributes(
  active: true,
  display_on: 'both',
  auto_capture: true,
  store: store,
  preferences: {
    publishable_key: ENV.fetch('STRIPE_PUBLISHABLE_KEY'),
    secret_key: ENV.fetch('STRIPE_SECRET_KEY')
  }
)
# validate: false skips SpreeStripe's validate_secret_key hook — a live
# Stripe API roundtrip at save time. The key still gets exercised for real
# when checkout creates a PaymentIntent.
gateway.save!(validate: false)
puts "OK: gateway #{gateway.id} (#{gateway.name})"
RUBY

# The signed-in checkout tests pay with Spree's Check method, which needs no
# payment provider. Sample data adds it hidden from the storefront. It is shown
# after the Stripe gateway, so a guest's checkout still opens on Stripe's form.
echo "==> Showing the Check payment method at checkout, after Stripe"
rails_runner <<'RUBY'
store = Spree::Store.default
check = store.payment_methods.find_by!(type: 'Spree::PaymentMethod::Check')
check.update!(active: true, storefront_visible: true)
check.move_to_bottom
puts "OK: #{check.name} at position #{check.reload.position}"
RUBY

# The sample catalog's products vary by color only and are all in stock at
# full price, so the product page tests for picking a color and a size, a
# discounted variant and a sold-out one need a product of their own.
echo "==> Creating a product with color and size options"
rails_runner <<'RUBY'
store = Spree::Store.default
color = Spree::OptionType.for_store(store).find_by!(name: 'color')
size = Spree::OptionType.for_store(store).find_or_create_by!(name: 'size') do |option_type|
  option_type.label = 'Size'
  option_type.kind = 'buttons'
end
colors = { 'black' => ['Black', '#000000'], 'red' => ['Red', '#cc0000'] }.to_h do |name, (label, code)|
  [name, color.option_values.find_or_create_by!(name: name) { |ov| ov.label = label; ov.color_code = code }]
end
sizes = %w[S M L].each_with_index.to_h do |label, index|
  [label, size.option_values.find_or_create_by!(name: label.downcase) { |ov| ov.label = label; ov.position = index + 1 }]
end

product = store.products.find_or_initialize_by(slug: 'e2e-two-option-tee')
product.assign_attributes(name: 'E2E Two-Option Tee', status: 'active', description: 'A product with color and size options.')
product.save!
product.option_types = [color, size]
location = Spree::StockLocation.order_default.first

# Black in S, M and L, red in S and M only. Red M is on sale and black L is
# sold out.
[
  ['black', 'S'], ['black', 'M'], ['black', 'L', { stock: 0 }],
  ['red', 'S'], ['red', 'M', { price: 15, compare_at: 25 }]
].each do |color_name, size_label, overrides = {}|
  sku = "E2E-TEE-#{color_name}-#{size_label}".upcase
  variant = product.variants.find_or_initialize_by(sku: sku)
  variant.option_values = [colors.fetch(color_name), sizes.fetch(size_label)]
  variant.set_price('USD', overrides.fetch(:price, 20), overrides[:compare_at])
  variant.save!
  stock_item = variant.stock_items.find_or_create_by!(stock_location: location)
  stock_item.update!(backorderable: false)
  stock_item.set_count_on_hand(overrides.fetch(:stock, 100))
end
# Saving the product creates a variant without options; the page would open on it.
product.variants.reject { |variant| variant.option_values.any? }.each(&:destroy!)
store.channels.each { |channel| product.product_publications.find_or_create_by!(channel: channel) }
puts "OK: #{product.slug} (#{product.variants.count} variants)"
RUBY

# Checkout's browser tests apply gift cards, see tax on a product of their own,
# and see a second market's prices in euros. Each gift card serves one test:
# a card applied to a cart stays on hold for that cart until it is applied to
# another, so two tests sharing one could refuse each other's.
echo "==> Creating checkout test data: gift cards, a taxed product, a market in euros"
rails_runner <<'RUBY'
store = Spree::Store.default
# Spree keeps a card's code in lower case and matches what a shopper types
# against it in lower case.
{ 'e2e-gift-part' => 25, 'e2e-gift-whole' => 100_000 }.each do |code, amount|
  store.gift_cards.find_or_create_by!(code: code) do |gift_card|
    gift_card.amount = amount
    gift_card.currency = 'USD'
  end
end

taxable = store.tax_categories.find_or_create_by!(name: 'E2E taxable')
store.tax_rates.find_or_create_by!(name: 'E2E 8% in the United States') do |rate|
  rate.tax_category = taxable
  rate.amount = BigDecimal('0.08')
  rate.country_code = 'US'
end
mug = store.products.find_or_initialize_by(slug: 'e2e-taxed-mug')
mug.assign_attributes(name: 'E2E Taxed Mug', status: 'active', description: 'A product taxed at 8% in the United States.', tax_category: taxable)
mug.save!
mug.default_variant.set_price('USD', 20)
mug.default_variant.save!
mug_stock = mug.default_variant.stock_items.find_or_create_by!(stock_location: Spree::StockLocation.order_default.first)
mug_stock.update!(backorderable: false)
mug_stock.set_count_on_hand(1000)
store.channels.each { |channel| mug.product_publications.find_or_create_by!(channel: channel) }

spain = store.markets.find_or_initialize_by(name: 'E2E Spain')
spain.assign_attributes(currency: 'EUR', default_locale: 'en', country_codes: ['ES'])
spain.save!
international = store.delivery_methods.find_by!(name: 'International Shipping')
international.calculator.update!(preferred_amounts: international.calculator.preferred_amounts.merge('EUR' => '18.00'))
puts "OK: gift cards, #{mug.slug}, the #{spain.name} market in #{spain.currency}"
RUBY

# Created via `bin/rails runner` rather than `spree api-key create`, because the
# key must be bound to a channel and the CLI has no --channel flag. Sample data
# seeds three channels ("Online Store", "Wholesale", "Point of Sale"), and a key
# with no channel cannot resolve one — every Store API read is then gated by
# StorefrontGating and answers 401 (surfacing to the client as 404). Binding to
# a channel whose storefront access is "public" is what makes guest reads work.
#
# The channel is immutable after creation ("Channel cannot be changed after the
# key is created"), so an existing E2E key bound to the wrong channel is revoked
# and replaced rather than updated.
echo "==> Creating publishable API key bound to a public channel"
api_key_output=$(rails_runner <<'RUBY'
store = Spree::Store.default
channel = store.channels.detect { |c| c.resolved_storefront_access == 'public' }
raise 'No public channel found on the default store.' if channel.nil?

existing = Spree::ApiKey.active.publishable.find_by(store: store, name: 'E2E')
existing.update!(revoked_at: Time.current) if existing && existing.channel_id != channel.id

key = Spree::ApiKey.active.publishable.find_by(store: store, name: 'E2E', channel: channel)
key ||= Spree::ApiKey.create!(store: store, name: 'E2E', key_type: 'publishable', channel: channel)

puts key.token
RUBY
)

publishable_key=$(printf '%s\n' "$api_key_output" | grep -oE 'pk_[A-Za-z0-9_-]+' | head -n 1)
if [[ -z "$publishable_key" ]]; then
  echo "Could not create a publishable API key:" >&2
  printf '%s\n' "$api_key_output" >&2
  exit 1
fi

cat >"$ENV_FILE" <<EOF
# Generated by scripts/e2e/bootstrap-spree.sh — DO NOT EDIT
SPREE_API_URL=$SPREE_URL
SPREE_PUBLISHABLE_KEY=$publishable_key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=$STRIPE_PUBLISHABLE_KEY
EOF

echo
echo "==> Done. Wrote $ENV_FILE"
echo "    SPREE_API_URL=$SPREE_URL"
echo "    SPREE_PUBLISHABLE_KEY=${publishable_key:0:12}…"
