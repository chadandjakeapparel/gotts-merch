import { redirect } from "next/navigation";
import { getUser, type SessionUser } from "./auth";
import { viewerPermissions } from "./permissions";
import type { Viewer } from "./types";

/** For portal pages: the signed-in user, or a redirect to sign in. */
export async function requireUser(options: { allowPasswordChange?: boolean } = {}): Promise<SessionUser> {
  let user: SessionUser | null = null;
  try {
    user = await getUser();
  } catch (error) {
    console.error("[portal]", error);
  }
  if (!user) redirect("/portal/login");
  if (user.mustChangePassword && !options.allowPasswordChange) redirect("/portal/account?welcome=1");
  return user;
}

export async function toViewer(user: SessionUser): Promise<Viewer> {
  return {
    name: user.name,
    email: user.email,
    role: user.role,
    permissions: await viewerPermissions(user),
    isAdmin: user.role === "staff" && (user.staffRole ?? "admin") === "admin",
  };
}
