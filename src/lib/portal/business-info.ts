import { db } from "./db";

export type BusinessAddress = {
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
};

export type BusinessInfo = {
  businessName: string;
  address: BusinessAddress;
  email: string;
  phone: string;
  ein: string;
  /** Where checks should be mailed, if different from the business address. */
  remitAddress: BusinessAddress;
};

type Row = Record<string, unknown>;
const str = (v: unknown) => String(v ?? "");

function toBusinessInfo(r: Row): BusinessInfo {
  return {
    businessName: str(r.business_name),
    address: {
      line1: str(r.address_line1),
      line2: str(r.address_line2),
      city: str(r.city),
      state: str(r.state),
      zip: str(r.zip),
    },
    email: str(r.email),
    phone: str(r.phone),
    ein: str(r.ein),
    remitAddress: {
      line1: str(r.remit_line1),
      line2: str(r.remit_line2),
      city: str(r.remit_city),
      state: str(r.remit_state),
      zip: str(r.remit_zip),
    },
  };
}

const BLANK_ADDRESS: BusinessAddress = { line1: "", line2: "", city: "", state: "", zip: "" };
const BLANK: BusinessInfo = {
  businessName: "",
  address: { ...BLANK_ADDRESS },
  email: "",
  phone: "",
  ein: "",
  remitAddress: { ...BLANK_ADDRESS },
};

/**
 * The business's own letterhead details -- name, address, contact info,
 * EIN, and where checks should be mailed. Used on estimate PDFs. A DB
 * hiccup degrades to blank rather than failing whatever page asked for it.
 */
export async function getBusinessInfo(): Promise<BusinessInfo> {
  try {
    const sql = await db();
    const [row] = await sql`select * from business_info where id = 1`;
    return row ? toBusinessInfo(row) : BLANK;
  } catch (error) {
    console.error("[business-info]", error);
    return BLANK;
  }
}

export type BusinessInfoInput = BusinessInfo;

function cleanAddress(a: BusinessAddress): BusinessAddress {
  return {
    line1: a.line1.trim().slice(0, 200),
    line2: a.line2.trim().slice(0, 200),
    city: a.city.trim().slice(0, 120),
    state: a.state.trim().slice(0, 60),
    zip: a.zip.trim().slice(0, 20),
  };
}

/** For /portal/admin/business-info (staff-only): replaces the whole record. */
export async function updateBusinessInfo(input: BusinessInfoInput): Promise<void> {
  const businessName = input.businessName.trim().slice(0, 200);
  const email = input.email.trim().slice(0, 200);
  const phone = input.phone.trim().slice(0, 60);
  const ein = input.ein.trim().slice(0, 20);
  const address = cleanAddress(input.address);
  const remitAddress = cleanAddress(input.remitAddress);

  const sql = await db();
  await sql`
    update business_info set
      business_name = ${businessName},
      address_line1 = ${address.line1}, address_line2 = ${address.line2},
      city = ${address.city}, state = ${address.state}, zip = ${address.zip},
      email = ${email}, phone = ${phone}, ein = ${ein},
      remit_line1 = ${remitAddress.line1}, remit_line2 = ${remitAddress.line2},
      remit_city = ${remitAddress.city}, remit_state = ${remitAddress.state}, remit_zip = ${remitAddress.zip},
      updated_at = now()
    where id = 1`;
}
