import { Document, Image, Page, Path, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import type { DailyReport } from "./daily-report";
import { REPORT_TIMEZONE } from "./daily-report";

const NAVY = "#0b2545";
const BLUE = "#1d4e89";
const INK = "#16263c";
const LINE = "#d7dee8";
const MUTED = "#5b6b82";
const SUNK = "#f3f6fb";

const currencyFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const currency = (n: number) => currencyFormat.format(n);

const styles = StyleSheet.create({
  page: { paddingTop: 44, paddingBottom: 50, paddingHorizontal: 44, fontSize: 9.5, color: INK, fontFamily: "Helvetica" },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  brandRow: { flexDirection: "row", alignItems: "center" },
  logoImage: { width: 28, height: 28, objectFit: "contain" },
  brandName: { fontSize: 15, fontFamily: "Helvetica-Bold", color: NAVY, marginLeft: 9 },
  brandNameAccent: { color: BLUE },
  docTitle: { fontSize: 17, fontFamily: "Helvetica-Bold", color: NAVY, textAlign: "right" },
  docMeta: { fontSize: 8.5, color: MUTED, textAlign: "right", marginTop: 3 },
  rule: { borderBottomWidth: 2, borderBottomColor: NAVY, marginBottom: 14 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 16 },
  statTile: { width: "33.33%", paddingRight: 10, marginBottom: 10 },
  statTileInner: { backgroundColor: SUNK, borderWidth: 1, borderColor: LINE, padding: 8 },
  statLabel: { fontSize: 7.5, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 0.6, textTransform: "uppercase" },
  statValue: { fontSize: 15, fontFamily: "Helvetica-Bold", color: NAVY, marginTop: 3 },
  statSub: { fontSize: 8, color: MUTED, marginTop: 1 },
  sectionLabel: { fontSize: 8, fontFamily: "Helvetica-Bold", color: MUTED, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 },
  activityRow: { flexDirection: "row", borderTopWidth: 1, borderTopColor: LINE, paddingVertical: 4 },
  activityTime: { width: 52, fontSize: 8.5, color: MUTED },
  activityArea: { width: 78, fontSize: 8, fontFamily: "Helvetica-Bold", color: BLUE, textTransform: "uppercase" },
  activityBody: { flex: 1, fontSize: 9, color: INK },
  activityTitle: { fontFamily: "Helvetica-Bold" },
  activityBy: { fontSize: 8, color: MUTED },
  empty: { fontSize: 9.5, color: MUTED, paddingVertical: 10 },
  truncNote: { fontSize: 8, color: MUTED, marginTop: 6, fontFamily: "Helvetica-Oblique" },
  footer: { position: "absolute", bottom: 24, left: 44, right: 44, borderTopWidth: 1, borderTopColor: LINE, paddingTop: 8, textAlign: "center" },
  footerText: { fontSize: 8, color: MUTED },
});

function FallbackLogoMark() {
  return (
    <Svg height={22} viewBox="0 0 48 48" width={22}>
      <Path d="M24 4a20 20 0 1 0 20 20h-9a11 11 0 1 1-3.1-13.9" fill="none" stroke={NAVY} strokeLinecap="round" strokeWidth={7} />
      <Path d="M27 17.5h12.5L33 24.5H25.5L27 17.5Z" fill={BLUE} />
    </Svg>
  );
}

/** Keeps one activity line to a single row so a busy day can't push the report past one page. */
function truncate(text: string, max = 95) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { timeZone: REPORT_TIMEZONE, hour: "numeric", minute: "2-digit" });
}

function fmtDateHeading(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { timeZone: REPORT_TIMEZONE, weekday: "long", month: "long", day: "numeric", year: "numeric" });
}

type Stat = { label: string; value: string; sub?: string };

/** A 1-page snapshot of everything logged in the portal from local midnight through when it's run. */
export function DailyReportPdfDocument({ report, logoUrl }: { report: DailyReport; logoUrl?: string }) {
  const { stats } = report;
  const tiles: Stat[] = [
    { label: "New leads", value: String(stats.newLeads) },
    { label: "Leads won", value: String(stats.leadsWon), sub: stats.leadsWon ? currency(stats.leadsWonValue) : undefined },
    { label: "Leads lost", value: String(stats.leadsLost) },
    { label: "Estimates sent", value: String(stats.estimatesSent) },
    { label: "Estimates approved", value: String(stats.estimatesApproved), sub: stats.estimatesApproved ? currency(stats.estimatesApprovedValue) : undefined },
    { label: "New jobs", value: String(stats.newJobs) },
    { label: "New customers", value: String(stats.newCustomers) },
    { label: "POs created", value: String(stats.purchaseOrdersCreated) },
    { label: "Tasks completed", value: String(stats.tasksCompleted) },
  ];

  return (
    <Document title={`Daily Report - ${fmtDateHeading(report.generatedAt)}`}>
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
            <Text style={styles.docTitle}>DAILY REPORT</Text>
            <Text style={styles.docMeta}>{fmtDateHeading(report.generatedAt)}</Text>
            <Text style={styles.docMeta}>As of {fmtTime(report.generatedAt)}</Text>
          </View>
        </View>
        <View style={styles.rule} />

        <View style={styles.statsGrid}>
          {tiles.map((tile) => (
            <View key={tile.label} style={styles.statTile}>
              <View style={styles.statTileInner}>
                <Text style={styles.statLabel}>{tile.label}</Text>
                <Text style={styles.statValue}>{tile.value}</Text>
                {tile.sub ? <Text style={styles.statSub}>{tile.sub}</Text> : null}
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Activity today ({report.activityTotal})</Text>
        {report.activity.length ? (
          report.activity.map((item, i) => (
            <View key={i} style={styles.activityRow} wrap={false}>
              <Text style={styles.activityTime}>{fmtTime(item.at)}</Text>
              <Text style={styles.activityArea}>{item.area}</Text>
              <Text style={styles.activityBody}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                {" — "}
                {truncate(item.detail)}
                {item.by ? <Text style={styles.activityBy}> ({item.by})</Text> : null}
              </Text>
            </View>
          ))
        ) : (
          <Text style={styles.empty}>Nothing logged yet today.</Text>
        )}
        {report.activityTotal > report.activityShown ? (
          <Text style={styles.truncNote}>
            Showing the {report.activityShown} most recent of {report.activityTotal} items today.
          </Text>
        ) : null}

        <View fixed style={styles.footer}>
          <Text style={styles.footerText}>Generated from the Gotts Merch portal · not for external distribution</Text>
        </View>
      </Page>
    </Document>
  );
}
