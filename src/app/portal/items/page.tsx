import { redirect } from "next/navigation";
import { ItemsApp } from "@/components/portal/items-app";
import { PortalHeader } from "@/components/portal/portal-header";
import { countCatalogItems, listCatalogItemFilters, listCatalogItems } from "@/lib/portal/catalog-items";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function ItemsPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

  let initialItems: Awaited<ReturnType<typeof listCatalogItems>> = [];
  let initialFilters = { itemTypes: [] as string[], vendors: [] as string[] };
  let initialTotal = 0;
  let loadError = "";
  try {
    [initialItems, initialFilters, initialTotal] = await Promise.all([
      listCatalogItems({ limit: 200 }),
      listCatalogItemFilters(),
      countCatalogItems(),
    ]);
  } catch (error) {
    console.error("[portal]", error);
    loadError = "The item catalog couldn't be loaded. Refresh the page to try again.";
  }

  return (
    <div className="portal">
      <PortalHeader current="items" viewer={toViewer(user)} />
      <main className="portal-main">
        <ItemsApp initialFilters={initialFilters} initialItems={initialItems} initialTotal={initialTotal} loadError={loadError} />
      </main>
    </div>
  );
}
