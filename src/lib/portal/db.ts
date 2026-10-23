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
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  check (role = 'staff' or client_id is not null)
);
create unique index if not exists users_email_key on users (lower(email));

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
