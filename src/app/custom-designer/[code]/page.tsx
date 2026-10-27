import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CustomDesignerApp } from "@/components/custom-designer-app";
import { getSiteContent } from "@/lib/content";
import { getDesignByCode } from "@/lib/designs";
import { listActiveDesignProducts } from "@/lib/design-products";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  // Private, per-customer links with no unique public content of their own
  // -- kept out of search entirely rather than competing with the real pages.
  return { title: `Your design | ${content.brandName}`, robots: { index: false, follow: false } };
}

export default async function SavedDesignPage({ params }: Params) {
  const { code } = await params;
  const design = await getDesignByCode(code);
  if (!design) notFound();

  const activeProducts = await listActiveDesignProducts();
  // Keep the design's own product selectable even if it was since deactivated,
  // so a saved design doesn't silently lose its product.
  const products = design.product && !activeProducts.some((p) => p.id === design.product!.id)
    ? [...activeProducts, design.product]
    : activeProducts;

  return <CustomDesignerApp initialDesign={design} products={products} />;
}
