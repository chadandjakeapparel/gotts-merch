import { redirect } from "next/navigation";
import { BusinessInfoApp } from "@/components/portal/business-info-app";
import { AccessDenied } from "@/components/portal/access-denied";
import { PortalHeader } from "@/components/portal/portal-header";
import { getBusinessInfo } from "@/lib/portal/business-info";
import { can } from "@/lib/portal/permissions";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function BusinessInfoPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

  if (!(await can(user, "business-info"))) {
    return (
      <div className="portal">
        <PortalHeader current="business-info" viewer={await toViewer(user)} />
        <main className="portal-main">
          <AccessDenied area="Business Information" />
        </main>
      </div>
    );
  }
  const businessInfo = await getBusinessInfo();
  return (
    <div className="portal">
      <PortalHeader current="business-info" viewer={await toViewer(user)} />
      <main className="portal-main">
        <BusinessInfoApp initial={businessInfo} />
      </main>
    </div>
  );
}
