import { redirect } from "next/navigation";
import { BlogAdminApp } from "@/components/portal/blog-admin-app";
import { PortalHeader } from "@/components/portal/portal-header";
import { getSiteContent } from "@/lib/content";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalBlogPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

  const content = await getSiteContent();

  return (
    <div className="portal">
      <PortalHeader current="blog" viewer={toViewer(user)} />
      <main className="portal-main">
        <BlogAdminApp
          initial={{
            blogEyebrow: content.blogEyebrow,
            blogTitle: content.blogTitle,
            blogLead: content.blogLead,
            blogPosts: content.blogPosts,
          }}
        />
      </main>
    </div>
  );
}
