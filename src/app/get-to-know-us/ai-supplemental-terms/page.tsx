import type { Metadata } from "next";
import { DocPage } from "@/components/doc-page";
import { getSiteContent } from "@/lib/content";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return { title: `AI Supplemental Terms | ${content.brandName}` };
}

export default async function AiSupplementalTermsPage() {
  const content = await getSiteContent();

  return (
    <DocPage title="AI Supplemental Terms" updated="October 25, 2026">
      <p>
        These terms supplement our <a href="/get-to-know-us/terms-of-service">Terms of Service</a> and{" "}
        <a href="/get-to-know-us/privacy-policy">Privacy Policy</a> and apply when {content.brandName} uses
        artificial intelligence tools to help run our website, client portal, or internal operations.
      </p>

      <h2>How we may use AI</h2>
      <p>
        We may use AI-assisted tools behind the scenes -- for example, to help draft or organize content, answer
        routine questions, or support our team in managing orders, inventory and customer records. AI tools work
        alongside our team; they don&apos;t replace human judgment on anything that affects your order, account,
        or legal rights.
      </p>

      <h2>No fully-automated decisions</h2>
      <p>
        We don&apos;t use AI to make final decisions about your order, pricing, or account status without a
        person able to review the outcome. If you believe an AI-assisted process produced an incorrect result,
        contact us and we&apos;ll have a person look into it.
      </p>

      <h2>Data used with AI tools</h2>
      <p>
        Where we use third-party AI tools, we share only the information needed for that tool to do its job, and
        we don&apos;t knowingly allow our customers&apos; data to be used to train a third party&apos;s general-purpose
        AI models. Our <a href="/get-to-know-us/privacy-policy">Privacy Policy</a> describes how we handle your
        information more broadly.
      </p>

      <h2>Changes to these terms</h2>
      <p>As we adopt new AI-assisted features, we&apos;ll update this page to reflect them.</p>

      <h2>Contact us</h2>
      <p>Questions about how we use AI? Email us at {content.inquiryEmail}.</p>
    </DocPage>
  );
}
