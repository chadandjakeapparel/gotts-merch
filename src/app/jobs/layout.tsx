import { Nav } from "@/components/nav";
import { SiteFooter } from "@/components/site-footer";
import { getSiteContent } from "@/lib/content";

export default async function JobsLayout({ children }: { children: React.ReactNode }) {
  const content = await getSiteContent();

  return (
    <div id="top">
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
