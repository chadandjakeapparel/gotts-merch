import { redirect } from "next/navigation";
import { AdminApp } from "@/components/portal/admin-app";
import { PortalHeader } from "@/components/portal/portal-header";
import { listClients, listUsers } from "@/lib/portal/accounts";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");
  const [clients, users] = await Promise.all([listClients(), listUsers()]);
  return (
    <div className="portal">
      <PortalHeader current="admin" viewer={toViewer(user)} />
      <main className="portal-main">
        <AdminApp currentUserId={user.id} initialClients={clients} initialUsers={users} />
      </main>
    </div>
  );
}
