import { redirect } from "next/navigation";
import { PurchaseOrdersApp } from "@/components/portal/purchase-orders-app";
import { PortalHeader } from "@/components/portal/portal-header";
import { listCustomers } from "@/lib/portal/customers";
import { listJobs } from "@/lib/portal/jobs";
import { listPurchaseOrders } from "@/lib/portal/purchase-orders";
import { requireUser, toViewer } from "@/lib/portal/session";
import { listVendors } from "@/lib/portal/vendors";

export const dynamic = "force-dynamic";

export default async function PurchaseOrdersPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

  let purchaseOrders: Awaited<ReturnType<typeof listPurchaseOrders>> = [];
  let vendors: Awaited<ReturnType<typeof listVendors>> = [];
  let jobs: Awaited<ReturnType<typeof listJobs>> = [];
  let customers: Awaited<ReturnType<typeof listCustomers>> = [];
  let loadError = "";
  try {
    [purchaseOrders, vendors, jobs, customers] = await Promise.all([
      listPurchaseOrders(),
      listVendors(),
      listJobs(),
      listCustomers(),
    ]);
  } catch (error) {
    console.error("[portal]", error);
    loadError = "Purchase orders couldn't be loaded. Refresh the page to try again.";
  }

  return (
    <div className="portal">
      <PortalHeader current="purchase-orders" viewer={toViewer(user)} />
      <main className="portal-main">
        <PurchaseOrdersApp
          customers={customers}
          initialPurchaseOrders={purchaseOrders}
          initialVendors={vendors}
          jobs={jobs}
          loadError={loadError}
        />
      </main>
    </div>
  );
}
