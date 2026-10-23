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
  return {
    title: content.metaTitle,
    description: content.metaDescription,
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={`${sora.variable} ${inter.variable}`} lang="en">
      <body>{children}</body>
    </html>
  );
}
