import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CustomDesignerApp } from "@/components/custom-designer-app";
import { getSiteContent } from "@/lib/content";
import { getDesignByCode } from "@/lib/designs";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ code: string }> };

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return { title: `Your design | ${content.brandName}` };
}

export default async function SavedDesignPage({ params }: Params) {
  const { code } = await params;
  const design = await getDesignByCode(code);
  if (!design) notFound();

  return <CustomDesignerApp initialDesign={design} />;
}
