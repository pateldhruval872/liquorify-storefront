# Liquorify Storybook for the storefront

Liquorify's Storybook of this storefront's components, with the token file and the Playwright visual check. It reproduces the storefront's existing appearance and behaviour; it never changes a storefront component. The architecture is in [LIQ-010](https://github.com/pateldhruval872/liquorify/blob/main/liquorify/LIQ-010-design-system-reproduction-architecture.md) in the backend repository, and the inventory it covers is LIQ-009 there.

## Run it

```bash
pnpm install
pnpm storybook          # http://localhost:6006
```

No Spree server is needed: the server actions the providers call are replaced with fixtures.

## Write a story

- **Where:** `stories/ui/` for primitives, `stories/<group>/` for feature components and `stories/pages/` for page-level components, mirroring `src/components/`. The title follows the same path, for example `Storefront/Cart/Cart drawer`.
- **Tag it with its inventory ID** from LIQ-009 (`tags: ['CMP-SF-G-03']`). For a component in a group, the last part of the title names its file.
- **Name each story after a state:** Default, Disabled, Loading, Empty, With items.
- **Data** comes from fixtures in `stories/fixtures/`. They are invented, never real data, and `pnpm test` checks each one against the SDK's schema.
- **Story needs** go in `parameters.liquorify`:
  - `storefront: true` mounts the store, auth and cart providers;
  - `cart` is what the cart server action returns, or `"loading"`;
  - `capture: 'viewport'` captures the whole page, for drawers and popups that render outside the story.
- **Tags that change the capture:** `system-dark` also captures the story with the system dark setting, for the parts that follow it (the toaster); `desktop-only` captures it at the desktop width only, for reference pages.

## Commands

| Command | What it does |
|---|---|
| `pnpm build-storybook` | Builds the static Storybook into `storybook-static/` |
| `pnpm tokens` / `pnpm tokens:check` | Regenerates, or checks, `stories/tokens/storefront.tokens.json` from `src/app/globals.css` |
| `pnpm coverage` | Lists which inventory IDs have stories |
| `pnpm visual` | Compares every story with its reference image, in the pinned Playwright image (needs Docker) |
| `pnpm visual:update` | Writes new and changed reference images, in the same image |
| `pnpm visual:copy <folder>` | Copies reviewed images from a downloaded CI artifact into the references |

`stories/inventory/ids.json` is written by the backend repository's `inventory-ids` script from LIQ-009. The scripts in `stories/scripts/` are unchanged copies of the backend's; change them there first.

## Reference images

Reference images live in `visual/__screenshots__/<story id>/<mode>.png`. Modes are `mobile` (390 pixels) and `desktop` (1280 pixels), in light, plus `desktop-system-dark` for stories tagged `system-dark`. They change only in a pull request, where the owner reviews each image before merging. CI never writes or accepts one.

To add or change references, build the Storybook, then either run `pnpm visual:update` with Docker, or download the `visual-failures` artifact from the pull request's Storybook run and run `pnpm visual:copy <folder>` after looking at the images. Commit the images, and list in the pull request which ones changed and why.

`pnpm visual:update` rewrites only the images that fail the comparison, and the comparison tolerates small colour differences in each pixel. After a change to something every story shares, rewrite them all with `sh visual/in-image.sh --update-snapshots=all`.

## Compare with the running storefront

`visual/fidelity/compare.spec.ts` opens chosen stories beside the same components on the built storefront. It saves both images side by side, and the computed styles of both sides with the differences between them, to `visual/fidelity/results/`. It is a diagnostic comparison: it passes whenever it can capture both sides, so a successful run does not by itself show that a story matches its screen. A person reviews the images and styles. It needs a Spree backend, the built storefront and the built Storybook running; the steps are at the top of the file. Run it in the pinned image, as `visual/in-image.sh` does, with `--network host` and `--config visual/fidelity/playwright.config.ts`. It only reads the pages, and its results are evidence for a review, not references.
