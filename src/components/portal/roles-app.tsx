"use client";

import { useState } from "react";
import { api } from "./api";

type Area = { key: string; label: string; group: string };
type Matrix = { sales_rep: Record<string, boolean>; finance: Record<string, boolean> };

const ROLE_COLUMNS: { key: "sales_rep" | "finance"; label: string }[] = [
  { key: "sales_rep", label: "Sales Rep" },
  { key: "finance", label: "Finance" },
];

export function RolesApp({ areas, initialPermissions }: { areas: Area[]; initialPermissions: Matrix }) {
  const [permissions, setPermissions] = useState(initialPermissions);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const groups = Array.from(new Set(areas.map((a) => a.group)));

  async function toggle(role: "sales_rep" | "finance", areaKey: string, allowed: boolean) {
    const cellKey = `${role}:${areaKey}`;
    setSaving(cellKey);
    setError("");
    const previous = permissions;
    setPermissions({ ...permissions, [role]: { ...permissions[role], [areaKey]: allowed } });
    try {
      await api("PATCH", "/api/portal/admin/roles", { staffRole: role, area: areaKey, allowed });
    } catch (err) {
      setPermissions(previous);
      setError(err instanceof Error ? err.message : "That change couldn't be saved. Try again.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <div className="portal-admin">
      <div className="portal-title-row">
        <div>
          <span className="portal-eyebrow">Staff</span>
          <h1>Roles &amp; permissions</h1>
        </div>
      </div>
      <p className="portal-hint">
        Admin logins always have full access everywhere and can&apos;t be restricted here. Sales Rep and Finance
        logins start with full access to every area below -- turn an area off for a role to hide it (and block its
        actions) for every login with that role.
      </p>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}

      {groups.map((group) => (
        <section className="portal-panel" key={group}>
          <div className="portal-panel-head">
            <h2>{group}</h2>
          </div>
          <div className="portal-table-wrap">
            <table className="portal-table">
              <thead>
                <tr>
                  <th>Area</th>
                  <th>Admin</th>
                  {ROLE_COLUMNS.map((c) => (
                    <th key={c.key}>{c.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {areas
                  .filter((a) => a.group === group)
                  .map((area) => (
                    <tr key={area.key}>
                      <td>{area.label}</td>
                      <td>
                        <input aria-label={`Admin: ${area.label} (always on)`} checked disabled type="checkbox" />
                      </td>
                      {ROLE_COLUMNS.map((c) => (
                        <td key={c.key}>
                          <input
                            aria-label={`${c.label}: ${area.label}`}
                            checked={permissions[c.key][area.key] ?? true}
                            disabled={saving === `${c.key}:${area.key}`}
                            onChange={(e) => void toggle(c.key, area.key, e.target.checked)}
                            type="checkbox"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
