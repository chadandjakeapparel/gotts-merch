import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { defaultContent, type SiteContent } from "@/content/site-content";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth";
import { getSiteContent, saveSiteContent } from "@/lib/content";

async function isAuthorized(): Promise<boolean> {
  const store = await cookies();
  return verifySessionToken(store.get(SESSION_COOKIE)?.value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isValidContent(value: unknown): value is SiteContent {
  if (!value || typeof value !== "object") return false;
  const data = value as Record<string, unknown>;

  const requiredStrings: (keyof SiteContent)[] = [
    "brandName",
    "logoUrl",
    "faviconUrl",
    "tagline",
    "inquiryEmail",
    "shopUrl",
    "metaTitle",
    "metaDescription",
    "ogImageUrl",
    "heroEyebrow",
    "heroLead",
    "productsEyebrow",
    "productsTitle",
    "activationsEyebrow",
    "activationsTitle",
    "activationsLead",
    "activationsStat",
    "activationsProcessEyebrow",
    "activationsProcessTitle",
    "activationsCtaTitle",
    "activationsCtaBody",
    "whyEyebrow",
    "whyTitle",
    "brandsEyebrow",
    "brandsTitle",
    "brandsLead",
    "aboutEyebrow",
    "aboutTitle",
    "aboutHistory",
    "retailEyebrow",
    "retailTitle",
    "retailBody",
    "processEyebrow",
    "processTitle",
    "faqEyebrow",
    "faqTitle",
    "footerTagline",
    "getToKnowUsEyebrow",
    "getToKnowUsTitle",
    "getToKnowUsLead",
  ];
  for (const key of requiredStrings) {
    if (typeof data[key] !== "string") return false;
  }

  if (!isStringArray(data.retailListItems)) return false;
  if (!isStringArray(data.venueTypes)) return false;
  if (!isStringArray(data.activationsProcessItems)) return false;

  if (
    !Array.isArray(data.activationsStations) ||
    !data.activationsStations.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).title === "string" &&
        typeof (item as Record<string, unknown>).description === "string",
    )
  ) {
    return false;
  }

  if (
    !Array.isArray(data.productCategories) ||
    !data.productCategories.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).key === "string" &&
        typeof (item as Record<string, unknown>).title === "string" &&
        typeof (item as Record<string, unknown>).description === "string" &&
        isStringArray((item as Record<string, unknown>).items),
    )
  ) {
    return false;
  }

  if (
    !Array.isArray(data.differentiators) ||
    !data.differentiators.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).title === "string" &&
        typeof (item as Record<string, unknown>).description === "string",
    )
  ) {
    return false;
  }

  if (
    !Array.isArray(data.brandPartners) ||
    !data.brandPartners.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).name === "string" &&
        typeof (item as Record<string, unknown>).description === "string" &&
        typeof (item as Record<string, unknown>).logoUrl === "string",
    )
  ) {
    return false;
  }

  if (
    !Array.isArray(data.teamMembers) ||
    !data.teamMembers.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).name === "string" &&
        typeof (item as Record<string, unknown>).role === "string" &&
        typeof (item as Record<string, unknown>).bio === "string" &&
        typeof (item as Record<string, unknown>).photoUrl === "string",
    )
  ) {
    return false;
  }

  if (
    !Array.isArray(data.processSteps) ||
    !data.processSteps.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).number === "string" &&
        typeof (item as Record<string, unknown>).title === "string" &&
        typeof (item as Record<string, unknown>).description === "string",
    )
  ) {
    return false;
  }

  if (
    !Array.isArray(data.faqItems) ||
    !data.faqItems.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).question === "string" &&
        typeof (item as Record<string, unknown>).answer === "string",
    )
  ) {
    return false;
  }

  if (
    !Array.isArray(data.documents) ||
    !data.documents.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).slug === "string" &&
        typeof (item as Record<string, unknown>).title === "string" &&
        typeof (item as Record<string, unknown>).description === "string" &&
        typeof (item as Record<string, unknown>).body === "string",
    )
  ) {
    return false;
  }

  if (
    !Array.isArray(data.golfGallery) ||
    !data.golfGallery.every(
      (item) =>
        item &&
        typeof item === "object" &&
        typeof (item as Record<string, unknown>).url === "string" &&
        typeof (item as Record<string, unknown>).caption === "string",
    )
  ) {
    return false;
  }

  return true;
}

export async function GET() {
  if (!(await isAuthorized())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const content = await getSiteContent();
  return NextResponse.json({ ok: true, content });
}

export async function POST(request: Request) {
  if (!(await isAuthorized())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  if (!isValidContent(body)) {
    return NextResponse.json(
      { ok: false, error: "Content failed validation" },
      { status: 422 },
    );
  }

  await saveSiteContent({ ...defaultContent, ...body });
  return NextResponse.json({ ok: true });
}
