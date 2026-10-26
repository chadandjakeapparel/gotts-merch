import { Nav } from "@/components/nav";
import { SiteFooter } from "@/components/site-footer";
import { GOOGLE_FONTS_HREF } from "@/lib/design-constants";
import { getSiteContent } from "@/lib/content";

export default async function CustomDesignerLayout({ children }: { children: React.ReactNode }) {
  const content = await getSiteContent();

  return (
    <div id="top">
      <link href={GOOGLE_FONTS_HREF} rel="stylesheet" />
      <Nav
        brandName={content.brandName}
        logoUrl={content.logoUrl}
        productCategories={content.productCategories}
        shopUrl={content.shopUrl}
      />
      <main>{children}</main>
      <SiteFooter content={content} />
    </div>
  );
}
