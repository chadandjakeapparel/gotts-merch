import { redirect } from "next/navigation";
import { FilesApp } from "@/components/portal/files-app";
import { AccessDenied } from "@/components/portal/access-denied";
import { PortalHeader } from "@/components/portal/portal-header";
import { listFolders } from "@/lib/portal/files";
import { can } from "@/lib/portal/permissions";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function FilesPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

  if (!(await can(user, "files"))) {
    return (
      <div className="portal">
        <PortalHeader current="files" viewer={await toViewer(user)} />
        <main className="portal-main">
          <AccessDenied area="Files" />
        </main>
      </div>
    );
  }

  let folders: Awaited<ReturnType<typeof listFolders>> = [];
  let loadError = "";
  try {
    folders = await listFolders(null);
  } catch (error) {
    console.error("[portal]", error);
    loadError = "The folder list couldn't be loaded. Refresh the page to try again.";
  }

  return (
    <div className="portal">
      <PortalHeader current="files" viewer={await toViewer(user)} />
      <main className="portal-main">
        <FilesApp initialFolders={folders} loadError={loadError} />
      </main>
    </div>
  );
}
