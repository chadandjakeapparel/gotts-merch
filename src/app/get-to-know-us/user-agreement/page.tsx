import type { Metadata } from "next";
import { DocPage } from "@/components/doc-page";
import { getSiteContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return { title: `User Agreement | ${content.brandName}` };
}

export default async function UserAgreementPage() {
  const content = await getSiteContent();

  return (
    <DocPage title="User Agreement" updated="October 25, 2026">
      <p>
        This agreement covers logging in to and using the {content.brandName} client portal -- the account where
        you can view inventory, orders, invoices and jobs we manage for you. It works alongside our{" "}
        <a href="/get-to-know-us/terms-of-service">Terms of Service</a> and{" "}
        <a href="/get-to-know-us/privacy-policy">Privacy Policy</a>.
      </p>

      <h2>Your account</h2>
      <p>
        We create your portal login and send you a temporary password, which you&apos;ll be asked to change on
        first sign-in. You&apos;re responsible for keeping your login credentials confidential and for all
        activity under your account. Tell us right away if you believe your account has been compromised.
      </p>

      <h2>What you can see and do</h2>
      <p>
        Your account shows information tied to your company: inventory on hand, order history, and -- where we
        enable it -- jobs and invoices. We decide what&apos;s visible to each account and may change that over
        time.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Use the portal only for your own business purposes. Don&apos;t share your login with anyone outside your
        organization, attempt to access another company&apos;s data, or use the portal in a way that could
        disrupt or harm it.
      </p>

      <h2>Suspension and termination</h2>
      <p>
        We may suspend or close portal access if we reasonably believe these terms have been violated, or if our
        business relationship ends. You can ask us to close your account at any time.
      </p>

      <h2>Changes to this agreement</h2>
      <p>We may update this agreement from time to time. Continued use of the portal after a change means you accept the update.</p>

      <h2>Contact us</h2>
      <p>Questions about your account? Email us at {content.inquiryEmail}.</p>
    </DocPage>
  );
}
