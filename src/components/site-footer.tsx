import Link from "next/link";
import { ClientLoginLink } from "@/components/client-login-link";
import { BrandMark } from "@/components/logo";
import type { SiteContent } from "@/content/site-content";

export function SiteFooter({ content }: { content: SiteContent }) {
  const year = new Date().getFullYear();

  return (
    <>
      <footer className="gm-footer">
        <div className="gm-container gm-footer__inner">
          <div className="gm-footer__brand">
            <div className="gm-footer__brand-mark">
              <BrandMark
                brandName={content.brandName}
                logoSize={30}
                logoUrl={content.logoUrl}
                wordmarkSize={15}
              />
            </div>
            <p className="gm-footer__tagline">{content.footerTagline}</p>
          </div>
          <nav aria-label="Footer navigation" className="gm-footer__nav">
            <Link href="/#products">Products</Link>
            <Link href="/charity-golf-tournaments">Charity Golf Tournaments</Link>
            <Link href="/aviation">Aviation</Link>
            <Link href="/brands">Brands</Link>
            <Link href="/custom-designer">Custom Designer</Link>
            <Link href="/#merch-activations">On-Site Activations</Link>
            <Link href="/#why-us">Why Us</Link>
            <Link href="/#about">About Us</Link>
            <Link href="/#process">How It Works</Link>
            <Link href="/#faq">FAQ</Link>
            <Link href="/#quote">Get a Quote</Link>
            <Link href="/blog">Blog</Link>
            <Link href="/get-to-know-us">Get to Know Us</Link>
          </nav>
        </div>
        <div className="gm-container gm-footer__bottom">
          <p>
            © {year} {content.brandName}. All rights reserved.
          </p>
        </div>
      </footer>
      <ClientLoginLink />
    </>
  );
}
