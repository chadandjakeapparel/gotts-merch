import type { Metadata } from "next";
import { DocPage } from "@/components/doc-page";
import { getSiteContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return { title: `Terms of Service | ${content.brandName}` };
}

export default async function TermsOfServicePage() {
  const content = await getSiteContent();

  return (
    <DocPage title="Terms of Service" updated="October 25, 2026">
      <p>
        These terms govern your use of the {content.brandName} website and your relationship with us as a
        customer. Logging in to our client portal is also governed by our{" "}
        <a href="/get-to-know-us/user-agreement">User Agreement</a>.
      </p>

      <h2>Quotes and orders</h2>
      <p>
        Quotes we provide are estimates and aren&apos;t final until we confirm your order. Prices, artwork,
        quantities and production timelines are subject to change until that confirmation. Payment terms will be
        provided with your order confirmation or invoice.
      </p>

      <h2>Artwork and intellectual property</h2>
      <p>
        You&apos;re responsible for making sure any logos, artwork or designs you provide to us are ones you have
        the rights to use. You grant us a license to use that artwork solely to produce your order. All content
        on our website -- including our own branding, photography and design -- belongs to {content.brandName}
        {" "}or our licensors.
      </p>

      <h2>Acceptable use</h2>
      <p>
        You agree not to use our website or services for any unlawful purpose, to misrepresent your identity, or
        to attempt to disrupt or gain unauthorized access to our systems.
      </p>

      <h2>Disclaimers</h2>
      <p>
        Our website and services are provided &quot;as is.&quot; We aim for accuracy but don&apos;t guarantee the
        website will always be available, error-free, or perfectly represent finished products (colors and
        materials can vary slightly from what&apos;s shown on screen).
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent permitted by law, {content.brandName} isn&apos;t liable for indirect, incidental or
        consequential damages arising from your use of our website or services. Our total liability for any
        claim is limited to the amount you paid for the order giving rise to the claim.
      </p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of the state in which {content.brandName} is based, without regard to conflict-of-law rules.</p>

      <h2>Changes to these terms</h2>
      <p>We may update these terms from time to time. Continued use of our website after a change means you accept the updated terms.</p>

      <h2>Contact us</h2>
      <p>Questions about these terms? Email us at {content.inquiryEmail}.</p>
    </DocPage>
  );
}
