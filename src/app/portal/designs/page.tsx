import { redirect } from "next/navigation";
import { DesignsApp } from "@/components/portal/designs-app";
import { AccessDenied } from "@/components/portal/access-denied";
import { PortalHeader } from "@/components/portal/portal-header";
import { listAllDesigns } from "@/lib/designs";
import { can } from "@/lib/portal/permissions";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function DesignsPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

  if (!(await can(user, "designs"))) {
    return (
      <div className="portal">
        <PortalHeader current="designs" viewer={await toViewer(user)} />
        <main className="portal-main">
          <AccessDenied area="Saved Designs" />
        </main>
      </div>
    );
  }
  const designs = await listAllDesigns();
  return (
    <div className="portal">
      <PortalHeader current="designs" viewer={await toViewer(user)} />
      <main className="portal-main">
        <DesignsApp initialDesigns={designs} />
      </main>
    </div>
  );
}
