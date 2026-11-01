import { redirect } from "next/navigation";
import { BusinessInfoApp } from "@/components/portal/business-info-app";
import { PortalHeader } from "@/components/portal/portal-header";
import { getBusinessInfo } from "@/lib/portal/business-info";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function BusinessInfoPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");
  const businessInfo = await getBusinessInfo();
  return (
    <div className="portal">
      <PortalHeader current="business-info" viewer={toViewer(user)} />
      <main className="portal-main">
        <BusinessInfoApp initial={businessInfo} />
      </main>
    </div>
  );
}
