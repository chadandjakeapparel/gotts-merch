export type OrderStatus = "open" | "fulfilled" | "shipped" | "cancelled";

export type Item = {
  id: number;
  styleNumber: string;
  styleName: string;
  color: string;
  size: string;
  qty: number;
  unitValue: number;
  /** Units on open (not yet fulfilled) orders. */
  committed: number;
  /** The customer this line is being held for, if any. */
  heldForCustomerId: number | null;
  updatedAt: string;
};

export type OrderLine = {
  id: number;
  itemId: number | null;
  styleNumber: string;
  styleName: string;
  color: string;
  size: string;
  qty: number;
  unitValue: number;
  rawText: string;
};

export type Order = {
  id: number;
  source: "manual" | "jotform";
  ref: string;
  customerName: string;
  shipTo: string;
  email: string;
  notes: string;
  status: OrderStatus;
  needsReview: boolean;
  carrier: string;
  tracking: string;
  createdAt: string;
  fulfilledAt: string | null;
  shippedAt: string | null;
  cancelledAt: string | null;
  lines: OrderLine[];
};

export type StockMove = {
  id: number;
  kind: "received" | "adjusted" | "imported" | "fulfilled" | "restored" | "added" | "deleted";
  itemId: number | null;
  orderId: number | null;
  qtyDelta: number;
  label: string;
  ref: string;
  note: string;
  createdAt: string;
};

export type PortalState = {
  items: Item[];
  orders: Order[];
  moves: StockMove[];
  /** Flag a style as low stock at or below this many units on hand. */
  lowStockThreshold: number;
};

export type ClientSummary = {
  id: number;
  name: string;
  webhookKey: string;
  itemCount: number;
  units: number;
  openOrders: number;
  userCount: number;
};

export type LeadStatus = "new" | "contacted" | "qualified" | "proposal" | "won" | "lost";

export type ContactMethod = "email" | "phone" | "text";

export type LeadActivity = {
  id: number;
  kind: "note" | "call" | "email" | "meeting" | "status";
  body: string;
  createdBy: string;
  createdAt: string;
};

export type Lead = {
  id: number;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  source: string;
  status: LeadStatus;
  contactMethod: ContactMethod;
  estimatedValue: number;
  owner: string;
  notes: string;
  lostReason: string;
  clientId: number | null;
  createdAt: string;
  updatedAt: string;
  activities: LeadActivity[];
};

export type CustomerKind = "company" | "individual";

export type SalesRep = {
  id: number;
  name: string;
};

export type Address = {
  name: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
};

export type ShippingAddress = Address & {
  id: number;
  isPrimary: boolean;
};

export type Customer = {
  id: number;
  kind: CustomerKind;
  companyName: string;
  firstName: string;
  lastName: string;
  billingAddress: Address;
  /** The primary shipping address; also the first entry in shippingAddresses. */
  shippingAddress: Address;
  shippingAddresses: ShippingAddress[];
  emails: string[];
  phone: string;
  pointOfContact: string;
  salesRepId: number | null;
  subscribed: boolean;
  /** Whether this business holds inventory on this customer's behalf. */
  inventoryHeld: boolean;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type JobStatus = "pending" | "in_production" | "ready" | "delivered";

export type JobActivity = {
  id: number;
  kind: "note" | "status" | "change";
  body: string;
  createdBy: string;
  createdAt: string;
};

export type JobFile = {
  id: number;
  fileName: string;
  url: string;
  contentType: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
};

export type Job = {
  id: number;
  customerId: number | null;
  jobName: string;
  contactName: string;
  status: JobStatus;
  /** "YYYY-MM-DD", or blank if not set. */
  inHandDate: string;
  goodsOrdered: boolean;
  poNumbers: string;
  decorationType: string;
  quantity: number;
  productionFacility: string;
  createdAt: string;
  updatedAt: string;
  activities: JobActivity[];
  files: JobFile[];
};

export type Task = {
  id: number;
  name: string;
  notes: string;
  /** "YYYY-MM-DD", or blank if not set. */
  completeBy: string;
  completed: boolean;
  completedAt: string | null;
  assignedToUserId: number | null;
  assignedToName: string;
  assignedByUserId: number | null;
  assignedByName: string;
  leadId: number | null;
  leadTitle: string;
  jobId: number | null;
  jobTitle: string;
  createdAt: string;
  updatedAt: string;
};

export type PortalUser = {
  id: number;
  email: string;
  name: string;
  role: "staff" | "client";
  clientId: number | null;
  mustChangePassword: boolean;
  /** The account owner; protected from removal, even by other staff logins. */
  isOwner: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

/** What the browser knows about the signed-in person. */
export type Viewer = {
  name: string;
  email: string;
  role: "staff" | "client";
};
