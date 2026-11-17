import { db } from "./db";

/** Business is assumed to run on this clock for "today" -- change here if that's wrong. */
export const REPORT_TIMEZONE = "America/New_York";

const str = (v: unknown) => (v == null ? "" : String(v));
const num = (v: unknown) => Number(v) || 0;

function tzOffsetMinutes(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = Object.fromEntries(dtf.formatToParts(date).map((p) => [p.type, p.value])) as Record<string, string>;
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return (asUtc - date.getTime()) / 60000;
}

/** Midnight, in `timeZone`, of the local calendar day containing `instant`. */
function startOfLocalDay(instant: Date, timeZone: string): Date {
  const offset = tzOffsetMinutes(instant, timeZone);
  const shifted = new Date(instant.getTime() + offset * 60000);
  const localMidnightAsUtc = Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
  return new Date(localMidnightAsUtc - offset * 60000);
}

/** Pulls the first "$1,234.56"-shaped amount out of a sentence like "Estimate approved ... ($1,234.56)". */
function firstDollarAmount(text: string): number {
  const match = text.match(/\$([0-9,]+\.[0-9]{2})/);
  return match ? Number(match[1].replace(/,/g, "")) : 0;
}

const customerTitle = (r: Record<string, unknown>) =>
  str(r.kind) === "company" ? str(r.company_name) || "Untitled company" : [str(r.first_name), str(r.last_name)].filter(Boolean).join(" ") || "Untitled customer";

export type DailyReportActivity = {
  at: string;
  area: string;
  title: string;
  detail: string;
  by: string;
};

export type DailyReportStats = {
  newLeads: number;
  leadsWon: number;
  leadsWonValue: number;
  leadsLost: number;
  estimatesSent: number;
  estimatesApproved: number;
  estimatesApprovedValue: number;
  newJobs: number;
  newCustomers: number;
  purchaseOrdersCreated: number;
  tasksCompleted: number;
};

export type DailyReport = {
  generatedAt: string;
  rangeStart: string;
  stats: DailyReportStats;
  activity: DailyReportActivity[];
  activityTotal: number;
  activityShown: number;
};

const ACTIVITY_CAP = 24;

/** Everything that happened in the portal from local midnight up through `now`. */
export async function getDailyReport(now: Date = new Date()): Promise<DailyReport> {
  const start = startOfLocalDay(now, REPORT_TIMEZONE);
  const sql = await db();

  const [leadActivities, jobActivities, newCustomers, newPurchaseOrders, completedTasks] = await Promise.all([
    sql`
      select la.*, l.company_name, l.contact_name, l.estimated_value
      from lead_activities la join leads l on l.id = la.lead_id
      where la.created_at >= ${start} and la.created_at <= ${now}
      order by la.created_at desc`,
    sql`
      select ja.*, j.job_name, j.sales_order_number
      from job_activities ja join jobs j on j.id = ja.job_id
      where ja.created_at >= ${start} and ja.created_at <= ${now}
      order by ja.created_at desc`,
    sql`select * from customers where created_at >= ${start} and created_at <= ${now} order by created_at desc`,
    sql`
      select po.*, v.name as vendor_name
      from purchase_orders po left join vendors v on v.id = po.vendor_id
      where po.created_at >= ${start} and po.created_at <= ${now}
      order by po.created_at desc`,
    sql`select * from tasks where completed and completed_at >= ${start} and completed_at <= ${now} order by completed_at desc`,
  ]);

  const stats: DailyReportStats = {
    newLeads: 0,
    leadsWon: 0,
    leadsWonValue: 0,
    leadsLost: 0,
    estimatesSent: 0,
    estimatesApproved: 0,
    estimatesApprovedValue: 0,
    newJobs: 0,
    newCustomers: newCustomers.length,
    purchaseOrdersCreated: newPurchaseOrders.length,
    tasksCompleted: completedTasks.length,
  };

  const activity: DailyReportActivity[] = [];

  for (const row of leadActivities) {
    const kind = str(row.kind);
    const body = str(row.body);
    if (kind === "status" && body === "Lead created") stats.newLeads += 1;
    if (kind === "status" && body.startsWith("Status changed to Won")) {
      stats.leadsWon += 1;
      stats.leadsWonValue += num(row.estimated_value);
    }
    if (kind === "status" && body.startsWith("Status changed to Lost")) stats.leadsLost += 1;
    if (kind === "estimate" && body.startsWith("Estimate sent")) stats.estimatesSent += 1;
    if (kind === "estimate" && body.startsWith("Estimate approved")) {
      stats.estimatesApproved += 1;
      stats.estimatesApprovedValue += firstDollarAmount(body);
    }
    activity.push({
      at: new Date(row.created_at as string).toISOString(),
      area: "CRM",
      title: str(row.company_name) || str(row.contact_name) || "Lead",
      detail: body,
      by: str(row.created_by),
    });
  }

  for (const row of jobActivities) {
    const body = str(row.body);
    if (str(row.kind) === "status" && body === "Job created") stats.newJobs += 1;
    activity.push({
      at: new Date(row.created_at as string).toISOString(),
      area: "Jobs",
      title: row.sales_order_number ? `SO ${str(row.sales_order_number)}` : str(row.job_name) || "Job",
      detail: body,
      by: str(row.created_by),
    });
  }

  for (const row of newCustomers) {
    activity.push({
      at: new Date(row.created_at as string).toISOString(),
      area: "Customers",
      title: customerTitle(row),
      detail: "New customer added",
      by: "",
    });
  }

  for (const row of newPurchaseOrders) {
    activity.push({
      at: new Date(row.created_at as string).toISOString(),
      area: "Purchase Orders",
      title: `PO #GM${str(row.po_number)}`,
      detail: row.vendor_name ? `Created for ${str(row.vendor_name)}` : "Created",
      by: "",
    });
  }

  for (const row of completedTasks) {
    activity.push({
      at: new Date(row.completed_at as string).toISOString(),
      area: "Tasks",
      title: str(row.name) || "Task",
      detail: "Completed",
      by: "",
    });
  }

  activity.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));

  return {
    generatedAt: now.toISOString(),
    rangeStart: start.toISOString(),
    stats,
    activity: activity.slice(0, ACTIVITY_CAP),
    activityTotal: activity.length,
    activityShown: Math.min(activity.length, ACTIVITY_CAP),
  };
}
