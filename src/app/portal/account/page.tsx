import { AccountForm } from "@/components/portal/account-form";
import { PortalHeader } from "@/components/portal/portal-header";
import { MIN_PASSWORD } from "@/lib/portal/auth";
import { requireUser, toViewer } from "@/lib/portal/session";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const user = await requireUser({ allowPasswordChange: true });
  return (
    <div className="portal">
      <PortalHeader current="account" viewer={toViewer(user)} />
      <main className="portal-main narrow">
        <AccountForm email={user.email} minLength={MIN_PASSWORD} mustChange={user.mustChangePassword} />
      </main>
    </div>
  );
}
