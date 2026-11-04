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
  kind: "note" | "call" | "email" | "meeting" | "status" | "estimate";
  body: string;
  createdBy: string;
  createdAt: string;
};

export type Lead = {
  id: number;
  companyName: string;
  contactName: string;
  jobName: string;
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
  /** The linked client (inventory/login tenant), if portal credentials have been set up for this customer. */
  clientId: number | null;
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

export type JobLineItem = {
  id: number;
  itemName: string;
  description: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
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
  salesOrderNumber: string;
  invoiceNumber: string;
  notes: string;
  /** Set when this job was auto-created from an approved estimate. */
  estimateId: number | null;
  /** Carried over from the estimate on approval, or built up directly on the job; same shape as an estimate's. */
  lineItems: JobLineItem[];
  taxRate: number;
  createdAt: string;
  updatedAt: string;
  activities: JobActivity[];
  files: JobFile[];
};

export type Vendor = {
  id: number;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: Address;
  notes: string;
  createdAt: string;
  updatedAt: string;
};

export type PurchaseOrderStatus = "draft" | "sent" | "received" | "cancelled";

export type PurchaseOrderLine = {
  id: number;
  itemName: string;
  description: string;
  color: string;
  size: string;
  quantity: number;
  unitCost: number;
};

export type PurchaseOrder = {
  id: number;
  /** Auto-assigned, sequential -- shown to vendors as "PO #GM<poNumber>" (the GM prefix is display-only). */
  poNumber: number;
  vendorId: number | null;
  /** The job(s)/sales order(s) this purchase order is sourcing goods for -- more than one when goods are ordered together for several jobs at once. */
  jobIds: number[];
  status: PurchaseOrderStatus;
  notes: string;
  lines: PurchaseOrderLine[];
  createdAt: string;
  updatedAt: string;
};

export type EstimateStatus = "draft" | "sent" | "approved" | "changes_requested";

export type EstimateLineItem = {
  id: number;
  /** The catalog item's name -- shown in bold on the printed estimate. */
  itemName: string;
  /** Free-text detail -- shown in italics, indented under the item name. */
  description: string;
  color: string;
  size: string;
  quantity: number;
  unitPrice: number;
  taxable: boolean;
};

export type Estimate = {
  id: number;
  leadId: number;
  status: EstimateStatus;
  lineItems: EstimateLineItem[];
  /** Sales tax percentage applied to taxable line items' amounts. */
  taxRate: number;
  notes: string;
  createdBy: string;
  sentAt: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** A master product record, independent of any client's own stock inventory -- used to autocomplete estimate line items. */
export type CatalogItem = {
  id: number;
  itemNumber: string;
  displayName: string;
  itemType: string;
  primaryVendor: string;
  createdAt: string;
  updatedAt: string;
};

export type JobPostingStatus = "live" | "not_live";

export type JobPosting = {
  id: number;
  title: string;
  location: string;
  employmentType: string;
  summary: string;
  /** The main body -- responsibilities, "about us," etc. Plain text; blank lines separate paragraphs, lines starting with "* " render as a bullet. */
  description: string;
  requirements: string;
  compensation: string;
  benefits: string;
  /** Where "Apply" sends candidates; blank hides the button. */
  applyUrl: string;
  status: JobPostingStatus;
  createdAt: string;
  updatedAt: string;
};

export type FolderFile = {
  id: number;
  fileName: string;
  url: string;
  contentType: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
};

export type FileFolder = {
  id: number;
  name: string;
  parentFolderId: number | null;
  subfolderCount: number;
  shareToken: string;
  shareTitle: string;
  shareExternally: boolean;
  /** Whether a share password has been set. */
  hasSharePassword: boolean;
  /** The share password in the clear, so staff can view and re-share it -- this is an access code for a read-only link, not a login credential. */
  sharePassword: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  files: FolderFile[];
  feedback: FolderFeedback[];
};

export type FolderFeedback = {
  id: number;
  name: string;
  email: string;
  message: string;
  createdAt: string;
};

/** A folder's ancestry, root-first, for breadcrumb navigation. */
export type FolderPathEntry = { id: number; name: string };

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
