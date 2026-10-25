import type { Metadata } from "next";
import { DocPage } from "@/components/doc-page";
import { getSiteContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return { title: `Privacy Policy | ${content.brandName}` };
}

export default async function PrivacyPolicyPage() {
  const content = await getSiteContent();

  return (
    <DocPage title="Privacy Policy" updated="October 25, 2026">
      <p>
        This policy explains what information {content.brandName} collects, how we use it, and the choices you
        have. It covers our website and our client portal.
      </p>

      <h2>Information we collect</h2>
      <p>We collect information in a few ways:</p>
      <ul>
        <li>Information you give us directly, such as your name, company, email address, phone number and shipping/billing address, when you request a quote, place an order, or use the client portal.</li>
        <li>Information created while you use the client portal, such as order history, inventory records, invoices and conversations with our team.</li>
        <li>Basic technical information collected automatically when you visit our website, such as your browser type and pages viewed.</li>
      </ul>

      <h2>How we use it</h2>
      <p>We use this information to:</p>
      <ul>
        <li>Prepare quotes, fulfill orders, and manage inventory on your behalf.</li>
        <li>Operate and secure the client portal, including your login.</li>
        <li>Respond to your questions and provide customer support.</li>
        <li>Send you information about your orders, invoices or account.</li>
        <li>Improve our website and services.</li>
      </ul>

      <h2>Sharing your information</h2>
      <p>
        We don&apos;t sell your personal information. We share it only with service providers who help us run our
        business (such as payment processing, hosting, or shipping carriers), when required by law, or with your
        consent -- for example, if you ask us to connect your account with another platform you use, such as
        QuickBooks.
      </p>

      <h2>Data security</h2>
      <p>
        We use reasonable technical and organizational measures to protect the information we hold, including
        encrypted connections, access controls on the client portal, and rate-limiting against repeated login
        attempts. No system is perfectly secure, and we can&apos;t guarantee absolute security.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask us to access, correct, or delete the personal information we hold about you by contacting us
        below. We&apos;ll respond to reasonable requests, though some information may need to be kept for legal,
        accounting or order-fulfillment reasons.
      </p>

      <h2>Children&apos;s privacy</h2>
      <p>Our website and portal are intended for business use and are not directed to children.</p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy from time to time. If we make material changes, we&apos;ll update the date at
        the top of this page.
      </p>

      <h2>Contact us</h2>
      <p>Questions about this policy? Email us at {content.inquiryEmail}.</p>
    </DocPage>
  );
}
