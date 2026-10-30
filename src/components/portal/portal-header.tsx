"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Viewer } from "@/lib/portal/types";

export type PortalNavKey =
  | "inventory"
  | "admin"
  | "crm"
  | "jobs"
  | "customers"
  | "tasks"
  | "files"
  | "designer-products"
  | "designs"
  | "quote"
  | "account";

export function PortalHeader({
  viewer,
  current,
  children,
}: {
  viewer: Viewer;
  current: PortalNavKey;
  children?: React.ReactNode;
}) {
  async function signOut() {
    await fetch("/api/portal/logout", { method: "POST" }).catch(() => {});
    window.location.assign("/portal/login");
  }

  // Staff land on CRM when they open the portal fresh (bare /portal), so the
  // Inventory nav link needs its own marker to still reach inventory.
  const inventoryHref = viewer.role === "staff" ? "/portal?view=inventory" : "/portal";

  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMenuOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  // Alphabetical, per how this menu was asked to be laid out.
  const adminMenuItems: [PortalNavKey, string, string][] = [
    ["admin", "/portal/admin", "Client Logins"],
    ["designer-products", "/portal/designer-products", "Designer Products"],
    ["quote", "/portal/quote", "Get a Quote"],
    ["inventory", inventoryHref, "Inventory"],
    ["account", "/portal/account", "My Account"],
    ["designs", "/portal/designs", "Saved Designs"],
  ];
  const adminMenuActive = adminMenuItems.some(([key]) => key === current);

  return (
    <header className="portal-top">
      <div className="portal-top-inner">
        <Link className="portal-brand" href="/portal">
          <span className="portal-mark">Client portal</span>
        </Link>
        <nav aria-label="Portal" className="portal-nav">
          {viewer.role === "staff" ? (
            <>
              <Link aria-current={current === "crm" ? "page" : undefined} href="/portal/crm">CRM</Link>
              <Link aria-current={current === "jobs" ? "page" : undefined} href="/portal/jobs">Job Board</Link>
              <Link aria-current={current === "customers" ? "page" : undefined} href="/portal/customers">Customers</Link>
              <Link aria-current={current === "tasks" ? "page" : undefined} href="/portal/tasks">Tasks</Link>
              <Link aria-current={current === "files" ? "page" : undefined} href="/portal/files">Files</Link>
              <div className="portal-nav-dropdown" ref={menuRef}>
                <button
                  aria-expanded={menuOpen}
                  className={`portal-nav-dropdown__trigger${adminMenuActive ? " active" : ""}`}
                  onClick={() => setMenuOpen((open) => !open)}
                  type="button"
                >
                  Administrative Tasks
                  <span aria-hidden="true" className="portal-nav-dropdown__caret">▾</span>
                </button>
                {menuOpen ? (
                  <div className="portal-nav-dropdown__menu" role="menu">
                    {adminMenuItems.map(([key, href, text]) => (
                      <Link
                        aria-current={current === key ? "page" : undefined}
                        href={href}
                        key={key}
                        onClick={() => setMenuOpen(false)}
                        role="menuitem"
                      >
                        {text}
                      </Link>
                    ))}
                  </div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <Link aria-current={current === "inventory" ? "page" : undefined} href={inventoryHref}>Inventory</Link>
              <Link aria-current={current === "account" ? "page" : undefined} href="/portal/account">My account</Link>
            </>
          )}
        </nav>
        <div className="portal-top-actions">
          {children}
          <span className="portal-who" title={viewer.email}>{viewer.name || viewer.email}</span>
          <button className="portal-btn ghost small" onClick={signOut} type="button">Sign out</button>
        </div>
      </div>
    </header>
  );
}
