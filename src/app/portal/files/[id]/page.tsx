import { notFound, redirect } from "next/navigation";
import { FolderDetailApp } from "@/components/portal/files-app";
import { PortalHeader } from "@/components/portal/portal-header";
import { getFolder, getFolderPath, listFolders } from "@/lib/portal/files";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

export default async function FolderDetailPage({ params }: Params) {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const folder = await getFolder(id);
  if (!folder) notFound();

  const [subfolders, path] = await Promise.all([listFolders(id), getFolderPath(id)]);

  return (
    <div className="portal">
      <PortalHeader current="files" viewer={toViewer(user)} />
      <main className="portal-main">
        <FolderDetailApp folder={folder} path={path} subfolders={subfolders} />
      </main>
    </div>
  );
}
