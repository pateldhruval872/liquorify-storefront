import type { Page } from "@playwright/test";

interface PointerClick {
  button: string;
  opens: Parameters<Page["getByRole"]>[0];
}

/**
 * A play function's clicks are synthetic, so the browser draws focus they move
 * as it does after a key press. A story that shows what a mouse click leaves
 * behind names, in `parameters.liquorify.pointerClick`, the button to press
 * with the mouse and the role of what it opens, which can load its code first.
 * Used by the visual check and by the comparison with running screens.
 */
export async function pressPointerClick(page: Page) {
  const pointerClick = await page.evaluate(
    () =>
      (
        window as {
          __STORYBOOK_PREVIEW__?: {
            currentRender?: {
              story?: {
                parameters?: { liquorify?: { pointerClick?: PointerClick } };
              };
            };
          };
        }
      ).__STORYBOOK_PREVIEW__?.currentRender?.story?.parameters?.liquorify
        ?.pointerClick,
  );
  if (!pointerClick) return;
  await page.getByRole("button", { name: pointerClick.button }).click();
  await page.getByRole(pointerClick.opens).waitFor();
  await page.waitForFunction(() =>
    document
      .getAnimations()
      .every((animation) => animation.playState !== "running"),
  );
}
