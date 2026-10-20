"use client";

import { useState } from "react";
import { BrandMark } from "@/components/logo";

const navLinks = [
  { href: "#products", label: "Products" },
  { href: "#why-us", label: "Why Us" },
  { href: "#about", label: "About Us" },
  { href: "#process", label: "How It Works" },
  { href: "#quote", label: "Get a Quote" },
];

export function Nav({
  brandName,
  logoUrl,
  shopUrl,
}: {
  brandName: string;
  logoUrl: string;
  shopUrl: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="gm-nav">
      <div className="gm-nav__inner">
        <a className="gm-nav__brand" href="#top">
          <BrandMark brandName={brandName} height={34} logoSize={30} logoUrl={logoUrl} wordmarkSize={17} />
        </a>
        <nav aria-label="Main navigation" className="gm-nav__links">
          {navLinks.map((link) => (
            <a href={link.href} key={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="gm-nav__actions">
          <a className="gm-btn gm-btn--primary gm-nav__cta" href="#quote">
            Get a Quote
          </a>
          <a
            className="gm-btn gm-btn--primary gm-nav__cta"
            href={shopUrl}
            rel="noreferrer"
            target="_blank"
          >
            Shop Now
          </a>
        </div>
        <button
          aria-expanded={open}
          aria-label={open ? "Close menu" : "Open menu"}
          className="gm-nav__toggle"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <span />
          <span />
        </button>
      </div>
      {open ? (
        <nav aria-label="Mobile navigation" className="gm-nav__mobile">
          {navLinks.map((link) => (
            <a href={link.href} key={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </a>
          ))}
          <a href={shopUrl} onClick={() => setOpen(false)} rel="noreferrer" target="_blank">
            Shop Now
          </a>
        </nav>
      ) : null}
    </header>
  );
}
