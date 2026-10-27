import type { Metadata } from "next";
import { BrandLogo } from "@/components/brand-logo";
import { FitBrandName } from "@/components/fit-brand-name";
import { Nav } from "@/components/nav";
import { SiteFooter } from "@/components/site-footer";
import { getSiteContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return {
    title: `${content.brandsTitle} | ${content.brandName}`,
    description: content.brandsLead,
    alternates: { canonical: "/brands" },
  };
}

export default async function BrandsPage() {
  const content = await getSiteContent();

  return (
    <div id="top">
      <Nav
        brandName={content.brandName}
        logoUrl={content.logoUrl}
        productCategories={content.productCategories}
        shopUrl={content.shopUrl}
      />

      <main>
        <section className="gm-brands gm-brands--page">
          <div className="gm-container">
            <div className="gm-section-heading">
              <p className="gm-eyebrow">{content.brandsEyebrow}</p>
              <h1>{content.brandsTitle}</h1>
              <p className="gm-brands__lead">{content.brandsLead}</p>
            </div>
            <div className="gm-brands__grid">
              {content.brandPartners.map((brand) => (
                <div className="gm-brands__card" key={brand.name}>
                  <BrandLogo logoUrl={brand.logoUrl} name={brand.name} />
                  <FitBrandName name={brand.name} />
                  <p>{brand.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <SiteFooter content={content} />
    </div>
  );
}
