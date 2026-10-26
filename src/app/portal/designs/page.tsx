import { redirect } from "next/navigation";
import { DesignsApp } from "@/components/portal/designs-app";
import { PortalHeader } from "@/components/portal/portal-header";
import { listAllDesigns } from "@/lib/designs";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function DesignsPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");
  const designs = await listAllDesigns();
  return (
    <div className="portal">
      <PortalHeader current="designs" viewer={toViewer(user)} />
      <main className="portal-main">
        <DesignsApp initialDesigns={designs} />
      </main>
    </div>
  );
}
