import { Header, HeaderMobileMenu } from "../../src/components/layout/Header";
import { rootCategories } from "../fixtures/catalog";

/** The header as the storefront layout composes it, with the menu's categories. */
export function StorefrontHeader() {
  return (
    <Header
      basePath="/us/en"
      locale="en"
      mobileNavigation={
        <HeaderMobileMenu rootCategories={rootCategories} basePath="/us/en" />
      }
    />
  );
}
