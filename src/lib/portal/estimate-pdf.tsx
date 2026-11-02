import { Document, Image, Page, Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import type { BusinessAddress, BusinessInfo } from "./business-info";
import { estimateTotals } from "./estimates";
import type { Estimate, Lead } from "./types";

const NAVY = "#0b2545";
const BLUE = "#1d4e89";
const INK = "#16263c";
const LINE = "#d7dee8";
const MUTED = "#5b6b82";

const currencyFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const currency = (n: number) => currencyFormat.format(n);

const styles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 64, paddingHorizontal: 48, fontSize: 10, color: INK, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  brandRow: { flexDirection: "row", alignItems: "center" },
  logoImage: { width: 32, height: 32, objectFit: "contain" },
  brandName: { fontSize: 17, fontFamily: "Helvetica-Bold", color: NAVY, marginLeft: 10 },
  brandNameAccent: { color: BLUE },
  docTitle: { fontSize: 20, fontFamily: "Helvetica-Bold", color: NAVY, textAlign: "right" },
  docMeta: { fontSize: 9, color: MUTED, textAlign: "right", marginTop: 4 },
  rule: { borderBottomWidth: 2, borderBottomColor: NAVY, marginBottom: 18 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 22 },
  infoBlock: { maxWidth: 260 },
  infoLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" },
  infoValue: { fontSize: 10.5, color: INK, marginBottom: 2 },
  table: { borderWidth: 1, borderColor: LINE },
  tableHeadRow: { flexDirection: "row", backgroundColor: NAVY },
  tableHeadCell: { padding: 7, fontSize: 8.5, fontFamily: "Helvetica-Bold", color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.5 },
  tableRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: LINE },
  tableCell: { padding: 7, fontSize: 9.5 },
  tableItemName: { fontFamily: "Helvetica-Bold", fontSize: 9.5 },
  tableItemAttrs: { fontSize: 8.5, color: MUTED, marginTop: 2, marginLeft: 10 },
  tableItemDesc: { fontFamily: "Helvetica-Oblique", fontSize: 8.5, color: MUTED, marginTop: 2, marginLeft: 10 },
  colDesc: { flex: 3 },
  colQty: { flex: 0.7, textAlign: "right" },
  colPrice: { flex: 1, textAlign: "right" },
  colTax: { flex: 0.8, textAlign: "center" },
  colAmount: { flex: 1, textAlign: "right" },
  totals: { marginTop: 16, alignSelf: "flex-end", width: 220 },
  totalsRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 3 },
  totalsLabel: { fontSize: 9.5, color: MUTED },
  totalsValue: { fontSize: 9.5, color: INK },
  grandRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: 7, marginTop: 4, borderTopWidth: 1.5, borderTopColor: NAVY },
  grandLabel: { fontSize: 11, fontFamily: "Helvetica-Bold", color: NAVY },
  grandValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: NAVY },
  notes: { marginTop: 24, paddingTop: 12, borderTopWidth: 1, borderTopColor: LINE },
  notesLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" },
  notesBody: { fontSize: 9.5, color: INK, lineHeight: 1.4 },
  remit: { marginTop: 16, padding: 12, backgroundColor: "#f3f6fb", borderWidth: 1, borderColor: LINE, maxWidth: 260 },
  remitLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: NAVY, letterSpacing: 1, marginBottom: 4, textTransform: "uppercase" },
  remitValue: { fontSize: 9.5, color: INK, marginBottom: 1 },
  footer: { position: "absolute", bottom: 28, left: 48, right: 48, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 10, textAlign: "center" },
  footerText: { fontSize: 8.5, color: MUTED },
});

/**
 * The site's default "G" mark (src/components/logo.tsx), ported to
 * react-pdf's SVG primitives -- shown only when no logo has been uploaded
 * in the admin site editor's Brand section, same fallback the live site
 * itself uses.
 */
function FallbackLogoMark() {
  return (
    <Svg height={26} viewBox="0 0 48 48" width={26}>
      <Path d="M24 4a20 20 0 1 0 20 20h-9a11 11 0 1 1-3.1-13.9" fill="none" stroke={NAVY} strokeLinecap="round" strokeWidth={7} />
      <Path d="M27 17.5h12.5L33 24.5H25.5L27 17.5Z" fill={BLUE} />
    </Svg>
  );
}

const STATUS_LABEL: Record<Estimate["status"], string> = {
  draft: "Draft",
  sent: "Awaiting approval",
  approved: "Approved",
  changes_requested: "Changes requested",
};

const fmtDate = (value: string | null) =>
  value ? new Date(value).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "";

/** "123 Main St", "Suite 4", "Austin, TX 78701" -- skipping any blank parts. */
function addressLines(a: BusinessAddress): string[] {
  const cityStateZip = [a.city, [a.state, a.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  return [a.line1, a.line2, cityStateZip].filter(Boolean);
}

/** A traditional printable estimate: letterhead, bill-to, line items, totals, notes. */
export function EstimatePdfDocument({
  estimate,
  lead,
  business,
  logoUrl,
}: {
  estimate: Estimate;
  lead: Lead;
  business: BusinessInfo;
  /** The logo uploaded in the admin site editor's Brand section, if any -- falls back to the default mark when blank. */
  logoUrl?: string;
}) {
  const { subtotal, tax, total } = estimateTotals(estimate);
  const billName = lead.companyName || lead.contactName || "Customer";
  const estimateNumber = `EST-${String(estimate.id).padStart(5, "0")}`;
  const date = fmtDate(estimate.sentAt || estimate.createdAt);
  const businessName = business.businessName || "Gotts Merch";
  const businessEmail = business.email || "hello@gottsmerch.com";
  const remitLines = addressLines(business.remitAddress);

  return (
    <Document title={`${estimateNumber} - ${billName}`}>
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.brandRow}>
            {logoUrl ? (
              // eslint-disable-next-line jsx-a11y/alt-text -- react-pdf's Image renders into a PDF, not the DOM; it has no alt prop.
              <Image src={logoUrl} style={styles.logoImage} />
            ) : (
              <FallbackLogoMark />
            )}
            <Text style={styles.brandName}>
              Gotts<Text style={styles.brandNameAccent}> Merch</Text>
            </Text>
          </View>
          <View>
            <Text style={styles.docTitle}>ESTIMATE</Text>
            <Text style={styles.docMeta}>{estimateNumber}</Text>
            <Text style={styles.docMeta}>{date}</Text>
          </View>
        </View>
        <View style={styles.rule} />

        <View style={styles.infoRow}>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Prepared for</Text>
            <Text style={styles.infoValue}>{billName}</Text>
            {lead.companyName && lead.contactName ? <Text style={styles.infoValue}>{lead.contactName}</Text> : null}
            {lead.email ? <Text style={styles.infoValue}>{lead.email}</Text> : null}
            {lead.phone ? <Text style={styles.infoValue}>{lead.phone}</Text> : null}
          </View>
          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>Prepared by</Text>
            <Text style={styles.infoValue}>{businessName}</Text>
            {addressLines(business.address).map((line) => (
              <Text key={line} style={styles.infoValue}>{line}</Text>
            ))}
            {business.phone ? <Text style={styles.infoValue}>{business.phone}</Text> : null}
            <Text style={styles.infoValue}>{businessEmail}</Text>
            {business.ein ? <Text style={styles.infoValue}>EIN {business.ein}</Text> : null}
            <Text style={styles.infoValue}>Status: {STATUS_LABEL[estimate.status]}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeadRow}>
            <Text style={[styles.tableHeadCell, styles.colDesc]}></Text>
            <Text style={[styles.tableHeadCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.tableHeadCell, styles.colPrice]}>Unit price</Text>
            <Text style={[styles.tableHeadCell, styles.colTax]}>Taxable</Text>
            <Text style={[styles.tableHeadCell, styles.colAmount]}>Amount</Text>
          </View>
          {estimate.lineItems.map((li) => (
            <View key={li.id} style={styles.tableRow}>
              <View style={[styles.tableCell, styles.colDesc]}>
                <Text style={styles.tableItemName}>{li.itemName}</Text>
                {li.color || li.size ? (
                  <Text style={styles.tableItemAttrs}>
                    {[li.color && `Color: ${li.color}`, li.size && `Size: ${li.size}`].filter(Boolean).join("   ")}
                  </Text>
                ) : null}
                {li.description ? <Text style={styles.tableItemDesc}>{li.description}</Text> : null}
              </View>
              <Text style={[styles.tableCell, styles.colQty]}>{li.quantity}</Text>
              <Text style={[styles.tableCell, styles.colPrice]}>{currency(li.unitPrice)}</Text>
              <Text style={[styles.tableCell, styles.colTax]}>{li.taxable ? "Yes" : "No"}</Text>
              <Text style={[styles.tableCell, styles.colAmount]}>{currency(li.quantity * li.unitPrice)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{currency(subtotal)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Tax ({estimate.taxRate}%)</Text>
            <Text style={styles.totalsValue}>{currency(tax)}</Text>
          </View>
          <View style={styles.grandRow}>
            <Text style={styles.grandLabel}>Total</Text>
            <Text style={styles.grandValue}>{currency(total)}</Text>
          </View>
        </View>

        {estimate.notes ? (
          <View style={styles.notes}>
            <Text style={styles.notesLabel}>Notes</Text>
            <Text style={styles.notesBody}>{estimate.notes}</Text>
          </View>
        ) : null}

        {remitLines.length ? (
          <View style={styles.remit}>
            <Text style={styles.remitLabel}>Remit payment (checks) to</Text>
            <Text style={styles.remitValue}>{businessName}</Text>
            {remitLines.map((line) => (
              <Text key={line} style={styles.remitValue}>{line}</Text>
            ))}
          </View>
        ) : null}

        <View fixed style={styles.footer}>
          <Text style={styles.footerText}>Thank you for the opportunity to work with you.</Text>
          <Text style={styles.footerText}>Questions? Reach us at {businessEmail}</Text>
        </View>
      </Page>
    </Document>
  );
}
