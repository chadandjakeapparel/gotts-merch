import { redirect } from "next/navigation";
import { FilesApp } from "@/components/portal/files-app";
import { PortalHeader } from "@/components/portal/portal-header";
import { listFolders } from "@/lib/portal/files";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function FilesPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

  let folders: Awaited<ReturnType<typeof listFolders>> = [];
  let loadError = "";
  try {
    folders = await listFolders();
  } catch (error) {
    console.error("[portal]", error);
    loadError = "The folder list couldn't be loaded. Refresh the page to try again.";
  }

  return (
    <div className="portal">
      <PortalHeader current="files" viewer={toViewer(user)} />
      <main className="portal-main">
        <FilesApp initialFolders={folders} loadError={loadError} />
      </main>
    </div>
  );
}
