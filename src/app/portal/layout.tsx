import type { Metadata } from "next";
import "./portal.css";

export const metadata: Metadata = {
  title: "Inventory Portal",
  robots: { index: false, follow: false },
};

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return <div className="portal-shell">{children}</div>;
}
