import { redirect } from "next/navigation";
import { getUser, type SessionUser } from "./auth";
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

export const toViewer = (user: SessionUser): Viewer => ({ name: user.name, email: user.email, role: user.role });
