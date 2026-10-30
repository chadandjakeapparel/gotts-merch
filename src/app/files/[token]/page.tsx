import type { Metadata } from "next";
import "@/app/portal/portal.css";
import { ShareFolderApp } from "@/components/portal/share-folder-app";
import { getSiteContent } from "@/lib/content";

export const metadata: Metadata = {
  title: "Shared files",
  robots: { index: false, follow: false },
};

type Params = { params: Promise<{ token: string }> };

export default async function SharedFolderPage({ params }: Params) {
  const { token } = await params;
  const content = await getSiteContent();
  return (
    <div className="portal-shell">
      <div className="portal">
        <main className="portal-main">
          <ShareFolderApp brandName={content.brandName} logoUrl={content.logoUrl} token={token} />
        </main>
      </div>
    </div>
  );
}
