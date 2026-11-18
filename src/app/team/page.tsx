import type { Metadata } from "next";
import Link from "next/link";
import { TeamAvatar } from "@/components/team-avatar";
import { getSiteContent } from "@/lib/content";
import { teamSlug } from "@/lib/team";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return {
    title: `Meet the Team | ${content.brandName}`,
    robots: { index: false, follow: false },
  };
}

export default async function TeamPage() {
  const content = await getSiteContent();

  return (
    <section className="gm-doc-page">
      <div className="gm-container">
        <nav aria-label="Breadcrumb" className="gm-breadcrumbs">
          <Link href="/">Home</Link>
          <span aria-hidden="true">/</span>
          <span>Meet the Team</span>
        </nav>

        <div className="gm-section-heading">
          <p className="gm-eyebrow">The people behind {content.brandName}</p>
          <h1>Meet the team</h1>
        </div>

        <div className="gm-about__team">
          {content.teamMembers.map((member) => (
            <Link className="gm-about__member" href={`/team/${teamSlug(member.name)}`} key={member.name}>
              <div className="gm-about__member-header">
                <TeamAvatar name={member.name} photoUrl={member.photoUrl} />
                <div>
                  <h3>{member.name}</h3>
                  <p className="gm-about__role">{member.role}</p>
                </div>
              </div>
              <p>{member.bio}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
