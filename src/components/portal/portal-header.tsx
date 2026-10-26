"use client";

import Link from "next/link";
import type { Viewer } from "@/lib/portal/types";

export function PortalHeader({
  viewer,
  current,
  children,
}: {
  viewer: Viewer;
  current: "inventory" | "admin" | "crm" | "jobs" | "customers" | "designer-products" | "designs" | "account";
  children?: React.ReactNode;
}) {
  async function signOut() {
    await fetch("/api/portal/logout", { method: "POST" }).catch(() => {});
    window.location.assign("/portal/login");
  }

  // Staff land on CRM when they open the portal fresh (bare /portal), so the
  // Inventory nav link needs its own marker to still reach inventory.
  const inventoryHref = viewer.role === "staff" ? "/portal?view=inventory" : "/portal";

  const links: [typeof current, string, string][] = [
    ["inventory", inventoryHref, "Inventory"],
    ...(viewer.role === "staff"
      ? ([
          ["crm", "/portal/crm", "CRM"],
          ["jobs", "/portal/jobs", "Job Board"],
          ["customers", "/portal/customers", "Customers"],
          ["designer-products", "/portal/designer-products", "Designer Products"],
          ["designs", "/portal/designs", "Saved Designs"],
          ["admin", "/portal/admin", "Clients & logins"],
        ] as [typeof current, string, string][])
      : []),
    ["account", "/portal/account", "My account"],
  ];

  return (
    <header className="portal-top">
      <div className="portal-top-inner">
        <Link className="portal-brand" href="/portal">
          <span className="portal-mark">Client portal</span>
        </Link>
        <nav aria-label="Portal" className="portal-nav">
          {links.map(([key, href, text]) => (
            <Link aria-current={current === key ? "page" : undefined} href={href} key={key}>{text}</Link>
          ))}
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
