import type { Metadata, Viewport } from "next";
import { Inter, Sora } from "next/font/google";
import { BRAND_NAME, TAGLINE } from "@/content/site-content";
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

export const metadata: Metadata = {
  title: `${BRAND_NAME} | Promotional Products for Hospitality`,
  description: `${TAGLINE} Apparel, print, drinkware, and retail merch made for restaurants, hotels, bars, and cafés.`,
};

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
