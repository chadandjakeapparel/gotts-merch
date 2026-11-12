import { redirect } from "next/navigation";
import { CustomersApp } from "@/components/portal/customers-app";
import { AccessDenied } from "@/components/portal/access-denied";
import { PortalHeader } from "@/components/portal/portal-header";
import { listCustomers, listSalesReps } from "@/lib/portal/customers";
import { can } from "@/lib/portal/permissions";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

  if (!(await can(user, "customers"))) {
    return (
      <div className="portal">
        <PortalHeader current="customers" viewer={await toViewer(user)} />
        <main className="portal-main">
          <AccessDenied area="Customers" />
        </main>
      </div>
    );
  }

  let customers: Awaited<ReturnType<typeof listCustomers>> = [];
  let salesReps: Awaited<ReturnType<typeof listSalesReps>> = [];
  let loadError = "";
  const [customersResult, repsResult] = await Promise.allSettled([listCustomers(), listSalesReps()]);
  if (customersResult.status === "fulfilled") {
    customers = customersResult.value;
  } else {
    console.error("[portal]", customersResult.reason);
    loadError = "The customer list couldn't be loaded. Refresh the page to try again.";
  }
  if (repsResult.status === "fulfilled") salesReps = repsResult.value;
  else console.error("[portal]", repsResult.reason);

  return (
    <div className="portal">
      <PortalHeader current="customers" viewer={await toViewer(user)} />
      <main className="portal-main">
        <CustomersApp initialCustomers={customers} initialSalesReps={salesReps} loadError={loadError} />
      </main>
    </div>
  );
}
