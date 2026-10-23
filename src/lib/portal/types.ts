export type OrderStatus = "open" | "fulfilled" | "shipped" | "cancelled";

export type Item = {
  id: number;
  styleNumber: string;
  styleName: string;
  color: string;
  qty: number;
  unitValue: number;
  /** Units on open (not yet fulfilled) orders. */
  committed: number;
  updatedAt: string;
};

export type OrderLine = {
  id: number;
  itemId: number | null;
  styleNumber: string;
  styleName: string;
  color: string;
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

export type PortalUser = {
  id: number;
  email: string;
  name: string;
  role: "staff" | "client";
  clientId: number | null;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  createdAt: string;
};

/** What the browser knows about the signed-in person. */
export type Viewer = {
  name: string;
  email: string;
  role: "staff" | "client";
};
