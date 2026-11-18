"use client";

import { Fragment, useState } from "react";
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
  const enabledCount = (role: "sales_rep" | "finance") => areas.filter((a) => permissions[role][a.key] ?? true).length;

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
        Admin always has full access everywhere and isn&apos;t shown below -- it can&apos;t be restricted. Sales Rep
        and Finance start with every area turned on; switch one off to hide that area (and block its actions) for
        every login with that role.
      </p>
      {error ? <p className="portal-msg err" role="alert">{error}</p> : null}

      <div className="portal-role-summary">
        {ROLE_COLUMNS.map((c) => (
          <div className="portal-role-summary-card" key={c.key}>
            <span className="portal-eyebrow">{c.label}</span>
            <div className="portal-role-summary-count">
              {enabledCount(c.key)} <span>of {areas.length} areas enabled</span>
            </div>
          </div>
        ))}
      </div>

      <section className="portal-panel">
        <div className="portal-table-wrap">
          <table className="portal-table">
            <thead>
              <tr>
                <th>Area</th>
                {ROLE_COLUMNS.map((c) => (
                  <th className="c" key={c.key}>{c.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <Fragment key={group}>
                  <tr className="group-row">
                    <th colSpan={1 + ROLE_COLUMNS.length}>{group}</th>
                  </tr>
                  {areas
                    .filter((a) => a.group === group)
                    .map((area) => (
                      <tr key={area.key}>
                        <td>{area.label}</td>
                        {ROLE_COLUMNS.map((c) => (
                          <td className="c" key={c.key}>
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
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
