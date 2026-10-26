import postgres from "postgres";

type Sql = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as {
  portalSql?: Sql;
  portalSchema?: Promise<void>;
};

function connectionString() {
  // The Vercel Postgres/Neon integration can be connected under a custom
  // env var prefix (e.g. STORAGE_DATABASE_URL) instead of the plain names —
  // check both so connecting it doesn't also require renaming anything.
  const url =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL_UNPOOLED ||
    process.env.STORAGE_DATABASE_URL ||
    process.env.STORAGE_POSTGRES_URL ||
    process.env.STORAGE_DATABASE_URL_UNPOOLED;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Connect a Postgres database (for example Neon from the Vercel Marketplace).",
    );
  }
  return url;
}

export function getSql(): Sql {
  if (!globalForDb.portalSql) {
    const url = connectionString();
    const local = /localhost|127\.0\.0\.1|\/var\/run|host=\//.test(url);
    globalForDb.portalSql = postgres(url, {
      max: 5,
      idle_timeout: 20,
      // Pooled (PgBouncer) connections cannot use prepared statements.
      prepare: false,
      ssl: local ? false : "require",
      onnotice: () => {},
    });
  }
  return globalForDb.portalSql;
}

const SCHEMA = `
create table if not exists clients (
  id serial primary key,
  name text not null,
  webhook_key text not null unique,
  low_stock_threshold integer not null default 6,
  created_at timestamptz not null default now()
);
-- Pre-existing databases created before the threshold was configurable.
alter table clients add column if not exists low_stock_threshold integer not null default 6;

create table if not exists users (
  id serial primary key,
  email text not null,
  name text not null default '',
  password_hash text not null,
  role text not null check (role in ('staff', 'client')),
  client_id integer references clients(id) on delete cascade,
  session_version integer not null default 1,
  must_change_password boolean not null default false,
  is_owner boolean not null default false,
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  check (role = 'staff' or client_id is not null)
);
create unique index if not exists users_email_key on users (lower(email));
-- Pre-existing databases created before the owner flag existed.
alter table users add column if not exists is_owner boolean not null default false;

create table if not exists items (
  id serial primary key,
  client_id integer not null references clients(id) on delete cascade,
  style_number text not null,
  style_name text not null default '',
  color text not null,
  size text not null default '',
  qty integer not null default 0,
  unit_value numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Pre-existing databases created before "size" was tracked.
alter table items add column if not exists size text not null default '';
drop index if exists items_client_style_color_key;
create unique index if not exists items_client_style_color_size_key
  on items (client_id, lower(style_number), lower(color), lower(size));

create table if not exists orders (
  id serial primary key,
  client_id integer not null references clients(id) on delete cascade,
  source text not null default 'manual',
  external_id text unique,
  ref text not null default '',
  customer_name text not null default '',
  ship_to text not null default '',
  email text not null default '',
  notes text not null default '',
  status text not null default 'open'
    check (status in ('open', 'fulfilled', 'shipped', 'cancelled')),
  needs_review boolean not null default false,
  carrier text not null default '',
  tracking text not null default '',
  raw jsonb,
  created_at timestamptz not null default now(),
  fulfilled_at timestamptz,
  shipped_at timestamptz,
  cancelled_at timestamptz
);
create index if not exists orders_client_created_idx on orders (client_id, created_at desc);

create table if not exists order_lines (
  id serial primary key,
  order_id integer not null references orders(id) on delete cascade,
  item_id integer references items(id) on delete set null,
  style_number text not null default '',
  style_name text not null default '',
  color text not null default '',
  size text not null default '',
  qty integer not null default 0,
  unit_value numeric(12, 2) not null default 0,
  raw_text text not null default ''
);
alter table order_lines add column if not exists size text not null default '';
create index if not exists order_lines_order_idx on order_lines (order_id);

create table if not exists stock_moves (
  id serial primary key,
  client_id integer not null references clients(id) on delete cascade,
  kind text not null,
  item_id integer references items(id) on delete set null,
  order_id integer references orders(id) on delete set null,
  qty_delta integer not null default 0,
  label text not null default '',
  ref text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists stock_moves_client_created_idx on stock_moves (client_id, created_at desc);

create table if not exists leads (
  id serial primary key,
  company_name text not null default '',
  contact_name text not null default '',
  email text not null default '',
  phone text not null default '',
  source text not null default '',
  status text not null default 'new'
    check (status in ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost')),
  estimated_value numeric(12, 2) not null default 0,
  owner text not null default '',
  notes text not null default '',
  lost_reason text not null default '',
  client_id integer references clients(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists leads_status_idx on leads (status);

create table if not exists lead_activities (
  id serial primary key,
  lead_id integer not null references leads(id) on delete cascade,
  kind text not null default 'note' check (kind in ('note', 'call', 'email', 'meeting', 'status')),
  body text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists lead_activities_lead_idx on lead_activities (lead_id, created_at desc);

create table if not exists login_lockouts (
  id text primary key,
  failed_attempts integer not null default 0,
  locked_until timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists sales_reps (
  id serial primary key,
  name text not null,
  created_at timestamptz not null default now()
);
create unique index if not exists sales_reps_name_key on sales_reps (lower(name));
insert into sales_reps (name) values ('Steven Gottsegen'), ('Jake Gottsegen'), ('House Account')
  on conflict do nothing;

create table if not exists customers (
  id serial primary key,
  kind text not null default 'company' check (kind in ('company', 'individual')),
  company_name text not null default '',
  first_name text not null default '',
  last_name text not null default '',
  billing_address text not null default '',
  shipping_address text not null default '',
  phone text not null default '',
  point_of_contact text not null default '',
  sales_rep_id integer references sales_reps(id) on delete set null,
  subscribed boolean not null default false,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customers_sales_rep_idx on customers (sales_rep_id);

-- Pre-existing databases created before a customer could hold inventory.
alter table customers add column if not exists inventory_held boolean not null default false;

-- A line of inventory can be earmarked as held for a particular customer;
-- only customers with inventory_held get offered for this.
alter table items add column if not exists held_for_customer_id integer references customers(id) on delete set null;
create index if not exists items_held_for_customer_idx on items (held_for_customer_id);

-- Pre-existing databases created before addresses were split into fields.
-- The old free-text billing_address/shipping_address columns are kept (not
-- dropped) so no data is lost, and their text is copied into the new line 1
-- once -- this only ever fires for a row whose line1 is still blank, so it
-- is a no-op after the first run.
alter table customers add column if not exists billing_name text not null default '';
alter table customers add column if not exists billing_line1 text not null default '';
alter table customers add column if not exists billing_line2 text not null default '';
alter table customers add column if not exists billing_city text not null default '';
alter table customers add column if not exists billing_state text not null default '';
alter table customers add column if not exists billing_zip text not null default '';
alter table customers add column if not exists billing_country text not null default 'US';
alter table customers add column if not exists shipping_name text not null default '';
alter table customers add column if not exists shipping_line1 text not null default '';
alter table customers add column if not exists shipping_line2 text not null default '';
alter table customers add column if not exists shipping_city text not null default '';
alter table customers add column if not exists shipping_state text not null default '';
alter table customers add column if not exists shipping_zip text not null default '';
alter table customers add column if not exists shipping_country text not null default 'US';
update customers set billing_line1 = billing_address where billing_line1 = '' and billing_address <> '';
update customers set shipping_line1 = shipping_address where shipping_line1 = '' and shipping_address <> '';

-- A customer can have several shipping addresses; exactly one is primary.
create table if not exists customer_shipping_addresses (
  id serial primary key,
  customer_id integer not null references customers(id) on delete cascade,
  name text not null default '',
  line1 text not null default '',
  line2 text not null default '',
  city text not null default '',
  state text not null default '',
  zip text not null default '',
  country text not null default 'US',
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customer_shipping_addresses_customer_idx on customer_shipping_addresses (customer_id);
create unique index if not exists customer_shipping_addresses_primary_key
  on customer_shipping_addresses (customer_id) where is_primary;

-- Pre-existing customers (from before addresses could be multiple) get
-- their old shipping_* columns copied in as their primary address; a
-- no-op once every customer has one.
insert into customer_shipping_addresses (customer_id, name, line1, line2, city, state, zip, country, is_primary)
select c.id, c.shipping_name, c.shipping_line1, c.shipping_line2, c.shipping_city, c.shipping_state, c.shipping_zip, c.shipping_country, true
from customers c
where not exists (select 1 from customer_shipping_addresses a where a.customer_id = c.id and a.is_primary);

create table if not exists customer_emails (
  id serial primary key,
  customer_id integer not null references customers(id) on delete cascade,
  email text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists customer_emails_customer_idx on customer_emails (customer_id);

create table if not exists jobs (
  id serial primary key,
  customer_id integer references customers(id) on delete set null,
  job_name text not null default '',
  contact_name text not null default '',
  status text not null default 'pending'
    check (status in ('pending', 'in_production', 'ready', 'delivered')),
  in_hand_date date,
  goods_ordered boolean not null default false,
  po_numbers text not null default '',
  decoration_type text not null default '',
  quantity integer not null default 0,
  production_facility text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists jobs_status_idx on jobs (status);
create index if not exists jobs_customer_idx on jobs (customer_id);

-- The public /custom-designer tool: no login, found again later by its code.
create table if not exists custom_designs (
  id serial primary key,
  code text not null unique,
  product text not null default 'black-tee'
    check (product in ('black-tee', 'white-hoodie', 'grey-crewneck')),
  layers jsonb not null default '[]',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
`;

/** Creates the tables on first use, so a fresh database needs no setup step. */
export async function db(): Promise<Sql> {
  const sql = getSql();
  if (!globalForDb.portalSchema) {
    globalForDb.portalSchema = sql.unsafe(SCHEMA).then(
      () => undefined,
      (error) => {
        globalForDb.portalSchema = undefined;
        throw error;
      },
    );
  }
  await globalForDb.portalSchema;
  return sql;
}
