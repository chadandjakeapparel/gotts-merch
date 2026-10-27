import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import { getSiteContent } from "@/lib/content";
import "@/styles/site.css";

const sora = Sora({
  subsets: ["latin"],
  variable: "--gm-font-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--gm-font-body",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gottsmerch.com";
  return {
    title: content.metaTitle,
    description: content.metaDescription,
    // Lets every page's own `alternates.canonical` be given as a relative
    // path and still resolve to the right absolute URL.
    metadataBase: new URL(siteUrl),
    alternates: { canonical: "/" },
    // Leaving faviconUrl blank keeps the default src/app/icon.svg mark.
    icons: content.faviconUrl ? { icon: content.faviconUrl } : undefined,
    openGraph: {
      title: content.metaTitle,
      description: content.metaDescription,
      siteName: content.brandName,
      type: "website",
      images: content.ogImageUrl ? [content.ogImageUrl] : undefined,
    },
    twitter: {
      card: content.ogImageUrl ? "summary_large_image" : "summary",
      title: content.metaTitle,
      description: content.metaDescription,
      images: content.ogImageUrl ? [content.ogImageUrl] : undefined,
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0b2545",
  colorScheme: "light",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const content = await getSiteContent();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gottsmerch.com";

  // Organization structured data — gives AI answer engines and search
  // crawlers a direct, unambiguous read on who this business is and what
  // it does, rather than relying on them to infer it from page copy.
  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: content.brandName,
    url: siteUrl,
    description: content.metaDescription,
    logo: content.logoUrl || `${siteUrl}/icon.svg`,
    email: content.inquiryEmail,
    knowsAbout: content.productCategories.map((category) => category.title),
  };

  return (
    <html className={`${sora.variable} ${inter.variable}`} lang="en">
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
          type="application/ld+json"
        />
      </body>
    </html>
  );
}
