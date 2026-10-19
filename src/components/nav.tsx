"use client";

import { useState } from "react";
import { Logo, Wordmark } from "@/components/logo";

const navLinks = [
  { href: "#products", label: "Products" },
  { href: "#why-us", label: "Why Us" },
  { href: "#process", label: "How It Works" },
  { href: "#quote", label: "Get a Quote" },
];

export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="gm-nav">
      <div className="gm-nav__inner">
        <a className="gm-nav__brand" href="#top">
          <Logo size={30} />
          <Wordmark size={17} />
        </a>
        <nav aria-label="Main navigation" className="gm-nav__links">
          {navLinks.map((link) => (
            <a href={link.href} key={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <a className="gm-btn gm-btn--primary gm-nav__cta" href="#quote">
          Get a Quote
        </a>
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
        </nav>
      ) : null}
    </header>
  );
}
