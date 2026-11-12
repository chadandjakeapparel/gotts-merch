import { db } from "./db";
import type { SessionUser, StaffRole } from "./auth";

export type AreaKey =
  | "crm"
  | "jobs"
  | "kpis"
  | "customers"
  | "tasks"
  | "files"
  | "items"
  | "purchase-orders"
  | "inventory"
  | "blog"
  | "business-info"
  | "designer-products"
  | "quote"
  | "job-postings"
  | "designs";

/** The backend areas an owner can restrict Sales Rep / Finance logins from. Order shown in Roles & Permissions. */
export const AREAS: { key: AreaKey; label: string; group: string }[] = [
  { key: "crm", label: "CRM", group: "Sales" },
  { key: "jobs", label: "Job Board", group: "Sales" },
  { key: "customers", label: "Customers", group: "Sales" },
  { key: "tasks", label: "Tasks", group: "Sales" },
  { key: "kpis", label: "KPIs", group: "Sales" },
  { key: "inventory", label: "Inventory", group: "Operations" },
  { key: "purchase-orders", label: "Purchase Orders", group: "Operations" },
  { key: "items", label: "Items (Catalog)", group: "Operations" },
  { key: "files", label: "Files", group: "Operations" },
  { key: "business-info", label: "Business Information", group: "Site content" },
  { key: "blog", label: "Blog", group: "Site content" },
  { key: "designer-products", label: "Designer Products", group: "Site content" },
  { key: "quote", label: "Quote Page Editor", group: "Site content" },
  { key: "job-postings", label: "Job Postings", group: "Site content" },
  { key: "designs", label: "Saved Designs", group: "Site content" },
];

const AREA_KEYS = new Set<string>(AREAS.map((a) => a.key));

export const STAFF_ROLES: { key: StaffRole; label: string }[] = [
  { key: "admin", label: "Admin" },
  { key: "sales_rep", label: "Sales Rep" },
  { key: "finance", label: "Finance" },
];

type PermissionMatrix = Record<Exclude<StaffRole, "admin">, Record<AreaKey, boolean>>;

function fullAccess(): Record<AreaKey, boolean> {
  return Object.fromEntries(AREAS.map((a) => [a.key, true])) as Record<AreaKey, boolean>;
}

/** The current matrix for sales_rep/finance; a role with no stored row for an area defaults to allowed. */
export async function getRolePermissions(): Promise<PermissionMatrix> {
  const sql = await db();
  const rows = await sql`select staff_role, area, allowed from role_permissions`;
  const matrix: PermissionMatrix = { sales_rep: fullAccess(), finance: fullAccess() };
  for (const row of rows) {
    const role = row.staff_role as "sales_rep" | "finance";
    const area = row.area as AreaKey;
    if (matrix[role] && AREA_KEYS.has(area)) matrix[role][area] = Boolean(row.allowed);
  }
  return matrix;
}

export async function setRolePermission(staffRole: "sales_rep" | "finance", area: AreaKey, allowed: boolean) {
  if (!AREA_KEYS.has(area)) return;
  const sql = await db();
  await sql`
    insert into role_permissions (staff_role, area, allowed) values (${staffRole}, ${area}, ${allowed})
    on conflict (staff_role, area) do update set allowed = excluded.allowed`;
}

/** Whether this signed-in staff user can use the given area. Admin is always true; other roles check the matrix. */
export async function can(user: SessionUser, area: AreaKey): Promise<boolean> {
  if (user.role !== "staff") return false;
  const role = user.staffRole ?? "admin";
  if (role === "admin") return true;
  const matrix = await getRolePermissions();
  return matrix[role][area] ?? true;
}

/** The full permission map for this user, for hiding nav links the viewer can't reach. */
export async function viewerPermissions(user: SessionUser): Promise<Record<AreaKey, boolean>> {
  if (user.role !== "staff" || (user.staffRole ?? "admin") === "admin") return fullAccess();
  const matrix = await getRolePermissions();
  return matrix[user.staffRole as "sales_rep" | "finance"];
}
