"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Viewer } from "@/lib/portal/types";

export type PortalNavKey =
  | "inventory"
  | "admin"
  | "roles"
  | "crm"
  | "jobs"
  | "kpis"
  | "customers"
  | "vendors"
  | "tasks"
  | "files"
  | "estimates"
  | "designer-products"
  | "designs"
  | "quote"
  | "business-info"
  | "items"
  | "job-postings"
  | "blog"
  | "purchase-orders"
  | "account";

type NavItem = [PortalNavKey, string, string];

function NavDropdown({
  label,
  items,
  current,
  active,
}: {
  label: string;
  items: NavItem[];
  current: PortalNavKey;
  active: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!items.length) return null;

  return (
    <div className="portal-nav-dropdown" ref={ref}>
      <button
        aria-expanded={open}
        className={`portal-nav-dropdown__trigger${active ? " active" : ""}`}
        onClick={() => setOpen((o) => !o)}
        type="button"
      >
        {label}
        <span aria-hidden="true" className="portal-nav-dropdown__caret">▾</span>
      </button>
      {open ? (
        <div className="portal-nav-dropdown__menu" role="menu">
          {items.map(([key, href, text]) => (
            <Link
              aria-current={current === key ? "page" : undefined}
              href={href}
              key={key}
              onClick={() => setOpen(false)}
              role="menuitem"
            >
              {text}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}

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

  // A staff login only sees a link if their role can use that area; "admin"
  // and "roles" (login/permission management) show for the Admin role only,
  // whatever Roles & Permissions says, since granting those would let a
  // restricted login just grant itself everything else. Vendors doesn't have
  // its own area -- it rides on "purchase-orders", same as the vendors API.
  const canSee = (key: PortalNavKey) =>
    key === "admin" || key === "roles"
      ? viewer.isAdmin
      : key === "account"
        ? true
        : key === "vendors"
          ? (viewer.permissions["purchase-orders"] ?? true)
          : (viewer.permissions[key as keyof typeof viewer.permissions] ?? true);

  const mainNavItems: NavItem[] = (
    [
      ["crm", "/portal/crm", "CRM"],
      ["jobs", "/portal/jobs", "Job Board"],
      ["kpis", "/portal/kpis", "KPIs"],
      ["tasks", "/portal/tasks", "Tasks"],
      ["files", "/portal/files", "Files"],
      ["items", "/portal/items", "Items"],
      ["purchase-orders", "/portal/purchase-orders", "Purchase Orders"],
    ] as NavItem[]
  ).filter(([key]) => canSee(key));

  const listsItems: NavItem[] = (
    [
      ["customers", "/portal/customers", "Customers"],
      ["vendors", "/portal/vendors", "Vendors"],
    ] as NavItem[]
  ).filter(([key]) => canSee(key));
  const listsActive = listsItems.some(([key]) => key === current);

  // Alphabetical, per how this menu was asked to be laid out.
  const adminMenuItems: NavItem[] = (
    [
      ["blog", "/portal/admin/blog", "Blog"],
      ["business-info", "/portal/admin/business-info", "Business Information"],
      ["admin", "/portal/admin", "Client Logins"],
      ["designer-products", "/portal/designer-products", "Designer Products"],
      ["quote", "/portal/quote", "Get a Quote"],
      ["inventory", inventoryHref, "Inventory"],
      ["job-postings", "/portal/admin/job-postings", "Job Postings"],
      ["account", "/portal/account", "My Account"],
      ["roles", "/portal/admin/roles", "Roles & Permissions"],
      ["designs", "/portal/designs", "Saved Designs"],
    ] as NavItem[]
  ).filter(([key]) => canSee(key));
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
              {mainNavItems.map(([key, href, text]) => (
                <Link aria-current={current === key ? "page" : undefined} href={href} key={key}>{text}</Link>
              ))}
              <NavDropdown active={listsActive} current={current} items={listsItems} label="Lists" />
              <NavDropdown active={adminMenuActive} current={current} items={adminMenuItems} label="Administrative Tasks" />
            </>
          ) : (
            <>
              <Link aria-current={current === "inventory" ? "page" : undefined} href={inventoryHref}>Inventory</Link>
              <Link aria-current={current === "estimates" ? "page" : undefined} href="/portal/estimates">Estimates</Link>
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
