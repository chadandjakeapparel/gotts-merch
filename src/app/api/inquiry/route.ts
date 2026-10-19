import { NextResponse } from "next/server";
import { INQUIRY_EMAIL } from "@/content/site-content";

type InquiryPayload = {
  name?: string;
  venue?: string;
  email?: string;
  phone?: string;
  venueType?: string;
  quantity?: string;
  products?: string;
  message?: string;
  website?: string;
};

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export async function POST(request: Request) {
  let payload: InquiryPayload;
  try {
    payload = (await request.json()) as InquiryPayload;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Invalid request" },
      { status: 400 },
    );
  }

  if (clean(payload.website, 200)) {
    return NextResponse.json({ ok: true });
  }

  const name = clean(payload.name, 120);
  const venue = clean(payload.venue, 160);
  const email = clean(payload.email, 200);
  const phone = clean(payload.phone, 80);
  const venueType = clean(payload.venueType, 80);
  const quantity = clean(payload.quantity, 80);
  const products = clean(payload.products, 300);
  const message = clean(payload.message, 4000);

  if (!name || !email || !message || !email.includes("@")) {
    return NextResponse.json(
      { ok: false, error: "Required fields are missing" },
      { status: 422 },
    );
  }

  const subject = encodeURIComponent(
    `Gotts Merch quote request from ${name}${venue ? ` — ${venue}` : ""}`,
  );
  const body = encodeURIComponent(
    [
      `Name: ${name}`,
      `Venue / company: ${venue || "Not provided"}`,
      `Email: ${email}`,
      `Phone: ${phone || "Not provided"}`,
      `Venue type: ${venueType || "Not selected"}`,
      `Products of interest: ${products || "Not selected"}`,
      `Estimated quantity: ${quantity || "Not selected"}`,
      "",
      "Message:",
      message,
    ].join("\n"),
  );

  return NextResponse.json({
    ok: true,
    mailto: `mailto:${INQUIRY_EMAIL}?subject=${subject}&body=${body}`,
  });
}
