import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TeamAvatar } from "@/components/team-avatar";
import { getSiteContent } from "@/lib/content";
import { findTeamMember } from "@/lib/team";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ slug: string }> };

async function loadMember(slug: string) {
  const content = await getSiteContent();
  return { content, member: findTeamMember(content.teamMembers, slug) };
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { content, member } = await loadMember((await params).slug);
  if (!member) return { title: `Not found | ${content.brandName}` };
  return {
    title: `${member.name} | ${content.brandName}`,
    description: member.bio,
    robots: { index: false, follow: false },
  };
}

export default async function TeamMemberPage({ params }: Params) {
  const { content, member } = await loadMember((await params).slug);
  if (!member) notFound();

  return (
    <section className="gm-doc-page">
      <div className="gm-container">
        <nav aria-label="Breadcrumb" className="gm-breadcrumbs">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <Link href="/team">Meet the Team</Link>
          <span aria-hidden="true">/</span>
          <span>{member.name}</span>
        </nav>

        <div className="gm-about__member-header">
          <TeamAvatar name={member.name} photoUrl={member.photoUrl} size={96} />
          <div>
            <h1>{member.name}</h1>
            <p className="gm-about__role">{member.role}</p>
          </div>
        </div>

        <div className="gm-doc__body">
          <p>{member.bio}</p>
        </div>

        <p>
          <Link href="/team">← Meet the whole team</Link>
        </p>

        <div className="gm-blog-cta">
          <p>Want to work with {content.brandName}?</p>
          <Link className="gm-btn gm-btn--primary" href="/#quote">
            Get a Quote
          </Link>
        </div>
      </div>
    </section>
  );
}
