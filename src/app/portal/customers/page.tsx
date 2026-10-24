import { redirect } from "next/navigation";
import { CustomersApp } from "@/components/portal/customers-app";
import { PortalHeader } from "@/components/portal/portal-header";
import { listCustomers, listSalesReps } from "@/lib/portal/customers";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

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
      <PortalHeader current="customers" viewer={toViewer(user)} />
      <main className="portal-main">
        <CustomersApp initialCustomers={customers} initialSalesReps={salesReps} loadError={loadError} />
      </main>
    </div>
  );
}
