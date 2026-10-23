import { NextResponse, type NextRequest } from "next/server";

/**
 * When the portal has its own domain (PORTAL_HOSTNAME, e.g. portal.gottsmerch.com),
 * visitors to that domain go straight to the portal instead of the marketing site.
 */
export function proxy(request: NextRequest) {
  const portalHost = process.env.PORTAL_HOSTNAME?.trim().toLowerCase();
  const host = request.headers.get("host")?.split(":")[0].toLowerCase();
  if (portalHost && host === portalHost) {
    return NextResponse.redirect(new URL("/portal", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!portal|api/|_next/|media/|client-login\\.js|icon\\.png|robots\\.txt|favicon\\.ico).*)"],
};
