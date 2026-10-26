import { redirect } from "next/navigation";
import { DesignerProductsApp } from "@/components/portal/designer-products-app";
import { PortalHeader } from "@/components/portal/portal-header";
import { listAllDesignProducts } from "@/lib/design-products";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function DesignerProductsPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");
  const products = await listAllDesignProducts();
  return (
    <div className="portal">
      <PortalHeader current="designer-products" viewer={toViewer(user)} />
      <main className="portal-main">
        <DesignerProductsApp initialProducts={products} />
      </main>
    </div>
  );
}
