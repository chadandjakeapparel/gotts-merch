import { notFound, redirect } from "next/navigation";
import { CustomerDetailApp } from "@/components/portal/customer-detail-app";
import { PortalHeader } from "@/components/portal/portal-header";
import { getCustomer, listSalesReps } from "@/lib/portal/customers";
import { listJobsByCustomer } from "@/lib/portal/jobs";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function CustomerDetailPage({ params }: Params) {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [customer, jobs, salesReps] = await Promise.all([
    getCustomer(id),
    listJobsByCustomer(id),
    listSalesReps(),
  ]);
  if (!customer) notFound();

  return (
    <div className="portal">
      <PortalHeader current="customers" viewer={toViewer(user)} />
      <main className="portal-main">
        <CustomerDetailApp customer={customer} jobs={jobs} salesReps={salesReps} />
      </main>
    </div>
  );
}
