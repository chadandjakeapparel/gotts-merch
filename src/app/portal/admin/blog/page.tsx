import { redirect } from "next/navigation";
import { BlogAdminApp } from "@/components/portal/blog-admin-app";
import { AccessDenied } from "@/components/portal/access-denied";
import { PortalHeader } from "@/components/portal/portal-header";
import { getSiteContent } from "@/lib/content";
import { listUsers } from "@/lib/portal/accounts";
import { can } from "@/lib/portal/permissions";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function PortalBlogPage() {
  const user = await requireUser();
  if (user.role !== "staff") redirect("/portal");

  if (!(await can(user, "blog"))) {
    return (
      <div className="portal">
        <PortalHeader current="blog" viewer={await toViewer(user)} />
        <main className="portal-main">
          <AccessDenied area="Blog" />
        </main>
      </div>
    );
  }

  const [content, users] = await Promise.all([getSiteContent(), listUsers()]);
  const authorOptions = Array.from(new Set(users.filter((u) => u.role === "staff").map((u) => u.name || u.email))).sort((a, b) =>
    a.localeCompare(b),
  );

  return (
    <div className="portal">
      <PortalHeader current="blog" viewer={await toViewer(user)} />
      <main className="portal-main">
        <BlogAdminApp
          authorOptions={authorOptions}
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
