# Geist font files for the visual check

The exact files Next.js's font loader fetches for `Geist` (`next/font/google`) from Google Fonts, version 5. Next.js copies them into the built storefront, but Storybook's stand-in for the font loader links to Google instead. The visual check serves these copies for those links, so no request leaves the page and the screenshots cannot change when Google updates the font. A link to a file that is not here fails the check.

Geist is licensed under the SIL Open Font License 1.1; see `OFL.txt`.
