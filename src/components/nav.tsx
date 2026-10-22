"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDownIcon } from "@/components/icons";
import { BrandMark } from "@/components/logo";
import type { ProductCategory } from "@/content/site-content";

const navLinks = [
  { href: "/#merch-activations", label: "On-Site Activations" },
  { href: "/#why-us", label: "Why Us" },
  { href: "/#about", label: "About Us" },
  { href: "/#process", label: "How It Works" },
];

export function Nav({
  brandName,
  logoUrl,
  productCategories,
  shopUrl,
}: {
  brandName: string;
  logoUrl: string;
  productCategories: ProductCategory[];
  shopUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [productsOpen, setProductsOpen] = useState(false);
  const [mobileProductsOpen, setMobileProductsOpen] = useState(false);
  const megaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (megaRef.current && !megaRef.current.contains(event.target as Node)) {
        setProductsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setProductsOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  return (
    <header className="gm-nav">
      <div className="gm-nav__inner">
        <Link className="gm-nav__brand" href="/#top">
          <BrandMark brandName={brandName} logoSize={30} logoUrl={logoUrl} wordmarkSize={17} />
        </Link>
        <nav aria-label="Main navigation" className="gm-nav__links">
          <div
            className="gm-mega"
            onBlur={(event) => {
              if (!megaRef.current?.contains(event.relatedTarget as Node)) {
                setProductsOpen(false);
              }
            }}
            onMouseLeave={() => setProductsOpen(false)}
            ref={megaRef}
          >
            <button
              aria-expanded={productsOpen}
              className="gm-mega__trigger"
              onClick={() => setProductsOpen(true)}
              onMouseEnter={() => setProductsOpen(true)}
              type="button"
            >
              Products
              <ChevronDownIcon className="gm-mega__chevron" />
            </button>
            {productsOpen ? (
              <div className="gm-mega__panel">
                <Link
                  className="gm-mega__featured"
                  href="/brands"
                  onClick={() => setProductsOpen(false)}
                >
                  <span className="gm-mega__featured-eyebrow">Featured</span>
                  <span className="gm-mega__featured-title">Brands</span>
                  <span className="gm-mega__featured-desc">
                    Every manufacturer brand we print and sew for, in one place.
                  </span>
                </Link>
                <div className="gm-mega__grid">
                  {productCategories.map((category) => (
                    <Link
                      className="gm-mega__item"
                      href={`/#product-${category.key}`}
                      key={category.key}
                      onClick={() => setProductsOpen(false)}
                    >
                      <span className="gm-mega__item-title">{category.title}</span>
                      <span className="gm-mega__item-desc">{category.description}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          {navLinks.map((link) => (
            <Link href={link.href} key={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="gm-nav__actions">
          <Link className="gm-btn gm-btn--primary gm-nav__cta" href="/#quote">
            Get a Quote
          </Link>
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
          <div className="gm-nav__mobile-group">
            <button
              aria-expanded={mobileProductsOpen}
              className="gm-nav__mobile-trigger"
              onClick={() => setMobileProductsOpen((current) => !current)}
              type="button"
            >
              Products
              <ChevronDownIcon className="gm-mega__chevron" />
            </button>
            {mobileProductsOpen ? (
              <div className="gm-nav__mobile-submenu">
                <Link href="/brands" onClick={() => setOpen(false)}>
                  Brands
                </Link>
                {productCategories.map((category) => (
                  <Link
                    href={`/#product-${category.key}`}
                    key={category.key}
                    onClick={() => setOpen(false)}
                  >
                    {category.title}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
          {navLinks.map((link) => (
            <Link href={link.href} key={link.href} onClick={() => setOpen(false)}>
              {link.label}
            </Link>
          ))}
          <Link href="/#quote" onClick={() => setOpen(false)}>
            Get a Quote
          </Link>
          <a href={shopUrl} onClick={() => setOpen(false)} rel="noreferrer" target="_blank">
            Shop Now
          </a>
        </nav>
      ) : null}
    </header>
  );
}
