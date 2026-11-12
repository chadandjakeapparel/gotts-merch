import { redirect } from "next/navigation";
import { AccessDenied } from "@/components/portal/access-denied";
import { PortalHeader } from "@/components/portal/portal-header";
import { VendorsApp } from "@/components/portal/vendors-app";
import { can } from "@/lib/portal/permissions";
import { requireUser, toViewer } from "@/lib/portal/session";
import { listVendors } from "@/lib/portal/vendors";

export const dynamic = "force-dynamic";

export default async function VendorsPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

  // Vendors doesn't have its own area in Roles & Permissions -- it rides on
  // "purchase-orders", same as the vendors API and the vendor picker on POs.
  if (!(await can(user, "purchase-orders"))) {
    return (
      <div className="portal">
        <PortalHeader current="vendors" viewer={await toViewer(user)} />
        <main className="portal-main">
          <AccessDenied area="Vendors" />
        </main>
      </div>
    );
  }

  let vendors: Awaited<ReturnType<typeof listVendors>> = [];
  let loadError = "";
  try {
    vendors = await listVendors();
  } catch (error) {
    console.error("[portal]", error);
    loadError = "The vendor list couldn't be loaded. Refresh the page to try again.";
  }

  return (
    <div className="portal">
      <PortalHeader current="vendors" viewer={await toViewer(user)} />
      <main className="portal-main">
        <VendorsApp initialVendors={vendors} loadError={loadError} />
      </main>
    </div>
  );
}
