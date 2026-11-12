import { redirect } from "next/navigation";
import { DesignerProductsApp } from "@/components/portal/designer-products-app";
import { AccessDenied } from "@/components/portal/access-denied";
import { PortalHeader } from "@/components/portal/portal-header";
import { listAllDesignProducts } from "@/lib/design-products";
import { can } from "@/lib/portal/permissions";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function DesignerProductsPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

  if (!(await can(user, "designer-products"))) {
    return (
      <div className="portal">
        <PortalHeader current="designer-products" viewer={await toViewer(user)} />
        <main className="portal-main">
          <AccessDenied area="Designer Products" />
        </main>
      </div>
    );
  }
  const products = await listAllDesignProducts();
  return (
    <div className="portal">
      <PortalHeader current="designer-products" viewer={await toViewer(user)} />
      <main className="portal-main">
        <DesignerProductsApp initialProducts={products} />
      </main>
    </div>
  );
}
