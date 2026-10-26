import { redirect } from "next/navigation";
import { LoginForm } from "@/components/portal/login-form";
import { getUser } from "@/lib/portal/auth";

export const dynamic = "force-dynamic";

export default async function PortalLoginPage() {
  const user = await getUser().catch(() => null);
  if (user) redirect(user.role === "staff" ? "/portal/crm" : "/portal");
  return <LoginForm />;
}
