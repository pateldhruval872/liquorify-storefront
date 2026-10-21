/** One way a story is captured: the colour scheme the browser reports, and a width. */
export interface CaptureMode {
  name: string;
  colorScheme: "light" | "dark";
  width: number;
}

/**
 * Shoppers see the light theme only, at a phone and a desktop width
 * (LIQ-010 §8). The focus outline and the toast container follow the system
 * dark setting, so stories of them are also captured with it.
 */
export const modes: CaptureMode[] = [
  { name: "mobile", colorScheme: "light", width: 390 },
  { name: "desktop", colorScheme: "light", width: 1280 },
];

export const systemDarkMode: CaptureMode = {
  name: "desktop-system-dark",
  colorScheme: "dark",
  width: 1280,
};
