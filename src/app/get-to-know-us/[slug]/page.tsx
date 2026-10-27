import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocBody } from "@/components/doc-body";
import { DocPage } from "@/components/doc-page";
import { getSiteContent } from "@/lib/content";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

async function loadDoc(slug: string) {
  const content = await getSiteContent();
  const doc = content.documents.find((d) => d.slug === slug) || null;
  return { content, doc };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { content, doc } = await loadDoc((await params).slug);
  if (!doc) return { title: `Not found | ${content.brandName}` };
  return {
    title: `${doc.title} | ${content.brandName}`,
    description: doc.description,
    alternates: { canonical: `/get-to-know-us/${doc.slug}` },
  };
}

export default async function DocumentPage({ params }: Params) {
  const { content, doc } = await loadDoc((await params).slug);
  if (!doc) notFound();

  return (
    <DocPage title={doc.title}>
      <DocBody body={doc.body} brandName={content.brandName} inquiryEmail={content.inquiryEmail} />
    </DocPage>
  );
}
