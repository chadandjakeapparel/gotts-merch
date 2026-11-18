import type { TeamMember } from "@/content/site-content";

/** "Jake Gottsegen" -> "jake-gottsegen", for /team/<slug> -- same scheme as blog post addresses. */
export function teamSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function findTeamMember(members: TeamMember[], slug: string): TeamMember | null {
  return members.find((m) => teamSlug(m.name) === slug) || null;
}
