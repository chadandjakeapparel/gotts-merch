import type { Metadata } from "next";
import { CustomDesignerApp } from "@/components/custom-designer-app";
import { getSiteContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return {
    title: `Custom Designer | ${content.brandName}`,
    description: "Design your own tee, hoodie or crewneck -- add text, pick a font and ink color, then save your design.",
  };
}

export default function CustomDesignerPage() {
  return <CustomDesignerApp initialDesign={null} />;
}
