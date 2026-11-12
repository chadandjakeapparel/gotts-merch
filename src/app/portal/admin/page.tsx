import { redirect } from "next/navigation";
import { AccessDenied } from "@/components/portal/access-denied";
import { AdminApp } from "@/components/portal/admin-app";
import { PortalHeader } from "@/components/portal/portal-header";
import { listClients, listUsers } from "@/lib/portal/accounts";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");
  // Client Logins creates and deletes staff logins, so it's never delegable --
  // only Admin, never Sales Rep / Finance, however Roles & Permissions is set.
  if ((user.staffRole ?? "admin") !== "admin") {
    return (
      <div className="portal">
        <PortalHeader current="admin" viewer={await toViewer(user)} />
        <main className="portal-main">
          <AccessDenied area="Client Logins" />
        </main>
      </div>
    );
  }
  const [clients, users] = await Promise.all([listClients(), listUsers()]);
  return (
    <div className="portal">
      <PortalHeader current="admin" viewer={await toViewer(user)} />
      <main className="portal-main">
        <AdminApp currentUserId={user.id} initialClients={clients} initialUsers={users} />
      </main>
    </div>
  );
}
