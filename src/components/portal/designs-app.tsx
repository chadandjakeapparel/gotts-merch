"use client";

import { useMemo, useState } from "react";
import type { DesignSummary } from "@/lib/designs";

function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function DesignsApp({ initialDesigns }: { initialDesigns: DesignSummary[] }) {
  const [query, setQuery] = useState("");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialDesigns;
    return initialDesigns.filter((d) => {
      const haystack = [d.code, d.product?.label || "", d.textSummary].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [initialDesigns, query]);

  async function copyLink(code: string) {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/custom-designer/${code}`);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode((current) => (current === code ? null : current)), 1500);
    } catch {}
  }

  return (
    <div className="portal-crm">
      <div className="portal-title-row">
        <div>
          <span className="portal-eyebrow">Staff</span>
          <h1>Saved Designs</h1>
        </div>
      </div>
      <p className="portal-hint">
        Every design a customer has saved in the Custom Designer, most recently updated first. Use &quot;Copy
        link&quot; to resend a customer their design if they&apos;ve lost it.
      </p>

      <div className="portal-toolbar">
        <input
          aria-label="Search saved designs"
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search code, product, or text…"
          type="search"
          value={query}
        />
      </div>

      <section className="portal-panel">
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Product</th>
                <th>Contains</th>
                <th>Updated</th>
                <th className="r"><span className="portal-sr">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.code}>
                  <td><span className="portal-tag">{d.code}</span></td>
                  <td>{d.product ? d.product.label : <span className="portal-muted">Deleted product</span>}</td>
                  <td>
                    {d.textSummary || <span className="portal-muted">No text</span>}
                    {d.imageCount ? (
                      <span className="portal-pill ok">{d.imageCount} {d.imageCount === 1 ? "image" : "images"}</span>
                    ) : null}
                  </td>
                  <td className="nowrap">{fmtDate(d.updatedAt)}</td>
                  <td className="r">
                    <span className="portal-row-actions">
                      <a className="portal-link small" href={`/custom-designer/${d.code}`} rel="noreferrer" target="_blank">Open</a>
                      <button className="portal-link small" onClick={() => copyLink(d.code)} type="button">
                        {copiedCode === d.code ? "Copied ✓" : "Copy link"}
                      </button>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!filtered.length ? (
          <div className="portal-empty">
            <p>{initialDesigns.length ? "No saved designs match that search." : "No designs have been saved yet."}</p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
