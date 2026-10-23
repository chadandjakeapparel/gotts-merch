import Link from "next/link";
import { PortalApp } from "@/components/portal/portal-app";
import { PortalHeader } from "@/components/portal/portal-header";
import { clientName, listClients } from "@/lib/portal/accounts";
import { getState } from "@/lib/portal/data";
import { requireUser, toViewer } from "@/lib/portal/session";
import type { ClientSummary, PortalState } from "@/lib/portal/types";

export const dynamic = "force-dynamic";

export default async function PortalPage({ searchParams }: { searchParams: Promise<{ client?: string }> }) {
  const user = await requireUser();
  const viewer = toViewer(user);

  let clients: ClientSummary[] | null = null;
  let clientId = user.clientId ?? 0;
  let name = "";
  if (user.role === "staff") {
    clients = await listClients();
    const requested = Number((await searchParams).client);
    clientId = clients.find((c) => c.id === requested)?.id ?? clients[0]?.id ?? 0;
    name = clients.find((c) => c.id === clientId)?.name ?? "";
    if (!clientId) {
      return (
        <div className="portal">
          <PortalHeader current="inventory" viewer={viewer} />
          <main className="portal-main">
            <section className="portal-panel portal-empty">
              <h1>Add your first client</h1>
              <p className="portal-muted">Each client gets their own inventory, orders, JotForm link and logins.</p>
              <Link className="portal-btn primary" href="/portal/admin">Go to Clients &amp; logins</Link>
            </section>
          </main>
        </div>
      );
    }
  } else {
    name = await clientName(clientId);
  }

  let state: PortalState = { items: [], orders: [], moves: [], lowStockThreshold: 6 };
  let loadError = "";
  try {
    state = await getState(clientId);
  } catch (error) {
    console.error("[portal]", error);
    loadError = "The inventory couldn't be loaded. Refresh the page to try again.";
  }

  return (
    <PortalApp
      clientId={clientId}
      clientName={name}
      clients={clients}
      initialState={state}
      key={clientId}
      loadError={loadError}
      viewer={viewer}
    />
  );
}
