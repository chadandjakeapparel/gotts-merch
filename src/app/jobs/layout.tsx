import type { Metadata } from "next";
import "../portal/portal.css";

export const metadata: Metadata = {
  title: "Jobs & Proofs",
  robots: { index: false, follow: false },
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <div className="portal-shell">{children}</div>;
}
