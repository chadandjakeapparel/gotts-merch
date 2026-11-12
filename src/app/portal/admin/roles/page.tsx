import { redirect } from "next/navigation";
import { AccessDenied } from "@/components/portal/access-denied";
import { PortalHeader } from "@/components/portal/portal-header";
import { RolesApp } from "@/components/portal/roles-app";
import { AREAS, getRolePermissions } from "@/lib/portal/permissions";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function RolesPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");
  // Same as Client Logins -- never delegable, whatever Roles & Permissions
  // itself says, since a role with access here could grant itself anything.
  if ((user.staffRole ?? "admin") !== "admin") {
    return (
      <div className="portal">
        <PortalHeader current="roles" viewer={await toViewer(user)} />
        <main className="portal-main">
          <AccessDenied area="Roles & Permissions" />
        </main>
      </div>
    );
  }
  const permissions = await getRolePermissions();
  return (
    <div className="portal">
      <PortalHeader current="roles" viewer={await toViewer(user)} />
      <main className="portal-main">
        <RolesApp areas={AREAS} initialPermissions={permissions} />
      </main>
    </div>
  );
}
