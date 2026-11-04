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

alter table leads add column if not exists contact_method text not null default 'email';
alter table leads drop constraint if exists leads_contact_method_check;
alter table leads add constraint leads_contact_method_check check (contact_method in ('email', 'phone', 'text'));

alter table leads add column if not exists job_name text not null default '';

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

-- Optionally links a customer to a client (the inventory/order/login tenant),
-- so a customer can have portal login credentials. Created on demand, the
-- first time a login is added from the customer's page.
alter table customers add column if not exists client_id integer references clients(id) on delete set null;
create index if not exists customers_client_idx on customers (client_id);
create unique index if not exists customers_client_unique_idx on customers (client_id) where client_id is not null;

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

alter table jobs add column if not exists notes text not null default '';
alter table jobs add column if not exists sales_order_number text not null default '';
alter table jobs add column if not exists invoice_number text not null default '';
-- Backs the auto-assigned Sales Order Number: a new job gets the next value
-- unless it's given one explicitly (e.g. importing legacy data).
create sequence if not exists sales_order_number_seq;

create table if not exists job_activities (
  id serial primary key,
  job_id integer not null references jobs(id) on delete cascade,
  kind text not null default 'note' check (kind in ('note', 'status', 'change')),
  body text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists job_activities_job_idx on job_activities (job_id, created_at desc);

create table if not exists job_files (
  id serial primary key,
  job_id integer not null references jobs(id) on delete cascade,
  file_name text not null default '',
  url text not null default '',
  content_type text not null default '',
  size integer not null default 0,
  uploaded_by text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists job_files_job_idx on job_files (job_id, created_at desc);

-- Products offered in /custom-designer, managed from /admin/designer-products.
-- A blank image_url falls back to the built-in SVG named by "placeholder", so
-- the 3 starting products keep working until real photos are uploaded.
create table if not exists design_products (
  id serial primary key,
  label text not null default '',
  image_url text not null default '',
  placeholder text,
  print_left integer not null default 37,
  print_top integer not null default 28,
  print_width integer not null default 26,
  print_height integer not null default 38,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists design_products_active_idx on design_products (active, sort_order);

-- Seeds the 3 original placeholder products once, the first time this table is empty.
insert into design_products (label, image_url, placeholder, print_left, print_top, print_width, print_height, sort_order)
select * from (values
  ('Classic Tee', '', 'black-tee', 37, 28, 26, 40, 1),
  ('Hooded Sweatshirt', '', 'white-hoodie', 37, 30, 26, 36, 2),
  ('Crewneck Sweatshirt', '', 'grey-crewneck', 37, 28, 26, 40, 3)
) as seed(label, image_url, placeholder, print_left, print_top, print_width, print_height, sort_order)
where not exists (select 1 from design_products);

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

-- Pre-existing designs saved before products moved into their own table: the
-- old "product" text column is kept (not dropped) and a matching product_id
-- is filled in once, by matching it to that product's placeholder key.
alter table custom_designs add column if not exists product_id integer references design_products(id) on delete set null;
update custom_designs c set product_id = dp.id
from design_products dp
where c.product_id is null and dp.placeholder = c.product;

-- The Get a Quote section at the bottom of the homepage -- its copy, and
-- every dropdown/checkbox option list on the quote form -- managed from
-- /portal/quote. Single row (id is always 1).
create table if not exists quote_section (
  id integer primary key default 1,
  eyebrow text not null default '',
  title text not null default '',
  body text not null default '',
  note text not null default '',
  venue_types jsonb not null default '[]',
  quantities jsonb not null default '[]',
  product_options jsonb not null default '[]',
  updated_at timestamptz not null default now(),
  constraint quote_section_single_row check (id = 1)
);

-- Seeds the row once with the copy and option lists already live on the
-- site, so moving this into the portal doesn't change anything on first deploy.
insert into quote_section (id, eyebrow, title, body, note, venue_types, quantities, product_options)
select
  1,
  'Start a quote',
  'Tell us what you need on the line.',
  'Share your venue and the products you''re picturing — from a single apron order to a full multi-location rollout. We''ll follow up with pricing and material recommendations.',
  'Replace this space with an approved customer quote once one is available.',
  '["Restaurant","Bar / nightlife","Hotel / resort","Café / coffee shop","Catering","Country club / private club","Other"]'::jsonb,
  '["Under 50","50–200","200–500","500+"]'::jsonb,
  '["Apparel (polos, aprons, chef coats, rain jackets)","Menus, print & tabletop (menu jackets, coasters, napkins, matchboxes, stickers)","Drinkware & to-go (cups, sleeves, stirrers, to-go bags)","Pens & retail merchandise","Not sure yet"]'::jsonb
where not exists (select 1 from quote_section);

-- Business/corporation letterhead details -- used on estimate PDFs and
-- wherever else the portal needs them. Single row (id is always 1).
create table if not exists business_info (
  id integer primary key default 1,
  business_name text not null default '',
  address_line1 text not null default '',
  address_line2 text not null default '',
  city text not null default '',
  state text not null default '',
  zip text not null default '',
  email text not null default '',
  phone text not null default '',
  ein text not null default '',
  remit_line1 text not null default '',
  remit_line2 text not null default '',
  remit_city text not null default '',
  remit_state text not null default '',
  remit_zip text not null default '',
  updated_at timestamptz not null default now(),
  constraint business_info_single_row check (id = 1)
);

-- Seeds the row with what's already known from the codebase; staff fill in
-- the rest (address, phone, EIN, remit-to) from the admin page.
insert into business_info (id, business_name, email)
select 1, 'Gotts Merch', 'hello@gottsmerch.com'
where not exists (select 1 from business_info);

-- Tasks: assignable from the Tasks page, a CRM lead, or a Job Board job.
-- Deleting a lead/job takes its tasks with it (same as lead_activities);
-- deleting a staff login just clears who it was assigned to/by.
create table if not exists tasks (
  id serial primary key,
  name text not null default '',
  notes text not null default '',
  complete_by date,
  completed boolean not null default false,
  completed_at timestamptz,
  assigned_to_user_id integer references users(id) on delete set null,
  assigned_by_user_id integer references users(id) on delete set null,
  lead_id integer references leads(id) on delete cascade,
  job_id integer references jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tasks_assigned_to_idx on tasks (assigned_to_user_id);
create index if not exists tasks_lead_idx on tasks (lead_id);
create index if not exists tasks_job_idx on tasks (job_id);

-- Files: staff-only folders of uploaded files, optionally shared externally
-- by a password-protected link (share_token stays stable even when sharing
-- is turned off, so re-enabling it doesn't change the link).
create table if not exists file_folders (
  id serial primary key,
  name text not null default '',
  parent_folder_id integer references file_folders(id) on delete cascade,
  share_token text not null default '',
  share_title text not null default '',
  share_externally boolean not null default false,
  share_password_hash text not null default '',
  created_by text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists file_folders_share_token_idx on file_folders (share_token);
alter table file_folders add column if not exists share_title text not null default '';
alter table file_folders add column if not exists parent_folder_id integer references file_folders(id) on delete cascade;
create index if not exists file_folders_parent_idx on file_folders (parent_folder_id);

create table if not exists folder_files (
  id serial primary key,
  folder_id integer not null references file_folders(id) on delete cascade,
  file_name text not null default '',
  url text not null default '',
  content_type text not null default '',
  size integer not null default 0,
  uploaded_by text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists folder_files_folder_idx on folder_files (folder_id, created_at desc);

-- The share password in the clear, alongside the hash already used to
-- check it -- this gates a read-only link, not an account, so staff being
-- able to view and re-share the code outweighs one-way hashing it.
alter table file_folders add column if not exists share_password text not null default '';

-- Feedback left by whoever's viewing a shared folder; visible to staff on
-- the folder's own page, never echoed back on the public share page.
create table if not exists folder_feedback (
  id serial primary key,
  folder_id integer not null references file_folders(id) on delete cascade,
  name text not null default '',
  email text not null default '',
  message text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists folder_feedback_folder_idx on folder_feedback (folder_id, created_at desc);

-- Estimates: one per lead, built by staff and sent for the customer to
-- approve or request changes on from their portal. Approving moves the
-- lead to Won and creates a Job Board job from the line items.
create table if not exists estimates (
  id serial primary key,
  lead_id integer not null references leads(id) on delete cascade,
  status text not null default 'draft'
    check (status in ('draft', 'sent', 'approved', 'changes_requested')),
  tax_rate numeric(5, 2) not null default 0,
  notes text not null default '',
  created_by text not null default '',
  sent_at timestamptz,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists estimates_lead_unique_idx on estimates (lead_id);

create table if not exists estimate_line_items (
  id serial primary key,
  estimate_id integer not null references estimates(id) on delete cascade,
  item_name text not null default '',
  description text not null default '',
  color text not null default '',
  size text not null default '',
  quantity integer not null default 1,
  unit_price numeric(12, 2) not null default 0,
  taxable boolean not null default true,
  sort_order integer not null default 0
);
create index if not exists estimate_line_items_estimate_idx on estimate_line_items (estimate_id, sort_order);

alter table jobs add column if not exists estimate_id integer references estimates(id) on delete set null;
create index if not exists jobs_estimate_idx on jobs (estimate_id);

-- Pre-existing databases created before tax moved from a flat dollar amount
-- to a rate applied per taxable line item.
alter table estimates add column if not exists tax_rate numeric(5, 2) not null default 0;
alter table estimate_line_items add column if not exists taxable boolean not null default true;

-- Pre-existing databases created before a line item's catalog-matched name
-- and its free-text description became separate fields -- what was called
-- "description" was really the item name, so carry its values over rather
-- than losing them.
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'estimate_line_items' and column_name = 'description')
    and not exists (select 1 from information_schema.columns where table_name = 'estimate_line_items' and column_name = 'item_name')
  then
    alter table estimate_line_items rename column description to item_name;
  end if;
end $$;
alter table estimate_line_items add column if not exists item_name text not null default '';
alter table estimate_line_items add column if not exists description text not null default '';
alter table estimate_line_items add column if not exists color text not null default '';
alter table estimate_line_items add column if not exists size text not null default '';

-- Catalog items: a master product list (name/number, display name, type,
-- vendor) managed from /portal/items -- independent of any client's own
-- stock inventory -- used to autocomplete estimate line item descriptions.
-- Expected to hold many thousands of rows, imported from a spreadsheet.
create table if not exists catalog_items (
  id serial primary key,
  item_number text not null,
  display_name text not null default '',
  item_type text not null default '',
  primary_vendor text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists catalog_items_number_key on catalog_items (item_number);
create index if not exists catalog_items_type_idx on catalog_items (item_type);
create index if not exists catalog_items_vendor_idx on catalog_items (primary_vendor);
create index if not exists catalog_items_display_name_idx on catalog_items (lower(display_name));

-- Wrapped in "table didn't exist yet" rather than plain "create table if not
-- exists" so the starter posting below is inserted exactly once, the moment
-- the table is first created -- never reappearing after someone deletes it.
do $$
begin
  if to_regclass('public.job_postings') is null then
    create table job_postings (
      id serial primary key,
      title text not null default '',
      location text not null default '',
      employment_type text not null default '',
      summary text not null default '',
      description text not null default '',
      requirements text not null default '',
      compensation text not null default '',
      benefits text not null default '',
      apply_url text not null default '',
      status text not null default 'not_live' check (status in ('live', 'not_live')),
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
    create index job_postings_status_idx on job_postings (status, updated_at desc);

    insert into job_postings (
      title, location, employment_type, summary, description, requirements, compensation, benefits, status
    ) values (
      'Account Executive', '', 'Full-time',
      $jpseed$Join HALO's sales team as an Account Executive, building and growing client relationships while delivering creative promotional brand solutions.$jpseed$,
      $jpseed$We are HALO! We connect people and brands to create unforgettable, meaningful, and lasting experiences that build brand engagement and loyalty for our over 60,000 clients globally, including over 100 of the Fortune 500. Our nearly 2,000 employees and 1,000 Account Executives located in 40+ sales offices across the United States are the reason HALO is #1 in our $25B industry.

HALO is looking for an Account Executive with 5+ years of proactive B2B sales experience to join an existing dynamic team! You will be tasked with learning and understanding our portfolio of projects, our capabilities and competitive advantages, generating meetings and penetrate new business with existing clients. You will also be responsible for developing, managing, and growing existing client accounts while meeting sales targets and expectations. Last but not least, you must exhibit high levels of professionalism and establish excellent customer relationships, manage client projects and deliver creative promotional brand solutions.

Note: this is a requisition created to help source external candidates for future opportunities. While HALO does not have any openings for this role at the moment, we are looking to proactively source for when the business need arises.

## Responsibilities

## Prospecting and Proactive Sales

- Identify new markets and business opportunities with existing clients
- Meet or exceed annual sales and gross profit goals

## Client and Project Management

- Develop and maintain strong client relationships
- Provide ongoing written and verbal communication throughout projects with both clients and internal support teams
- Handle challenges or obstacles with clients and/or vendors
- Understand and utilize all internal support resources and processes to mitigate project risk and maximize profits

## Sales Team Leadership

- Work closely with your support team to manage project workflow ensuring all project components are on task, on time and on budget
- Provide managerial support, leadership and clear direction on all projects
- Consistently demonstrate and convey a positive attitude, strong work ethic, trustworthiness and empathy

## More About HALO

At HALO, we energize our clients' brands and amplify their stories to capture the attention of those who matter most. That's why over 60,000 small- and mid-sized businesses partner with us, making us the global leader in the branded merchandise industry.

- Career Advancement: At HALO, we're passionate about promoting from within. Internal promotions have been key to our exponential growth over the past few years. With so many industry leaders at HALO, you'll have the opportunity to accelerate your career by learning from their experience, insights, and skills. Plus, you'll gain access to HALO's influential global network, leadership opportunities, and diverse perspectives.
- Culture: We love working here, and we're confident you will too. At HALO, you'll experience a culture of ingenuity, inclusion, and relentless determination. We push the limits of possibility and imagination by staying curious, humble, and bold breaking through yesterday's limits. Diversity fuels our creativity, and we thrive when each of us contributes to an inclusive environment based on respect, dignity, and equity. We hold ourselves to a high standard of excellence with a commitment to results and supporting one another with accountability, transparency, and dependability.
- Recognition: At HALO, your success is our success. You can count on us to celebrate your wins. Colleagues across the company will join in recognizing your milestones and nominating you for awards. Over time, you'll accumulate recognition that can be converted into gift cards, trips, concert tickets, and merchandise from your favorite brands.
- Flexibility: Many of our roles offer hybrid work options, and we pride ourselves on flexible schedules that help you balance professional and personal demands. We believe that supporting our customers is a top priority and trust that you and your manager will collaborate to create a schedule that achieves this goal.

## How to Apply

Click Apply above to submit your application. A resume is optional. Once you've submitted your application, you'll receive a confirmation email.

## Application Deadline

Applications are reviewed and processed only when there is a specific need or opportunity, rather than on a fixed schedule or at a set deadline. Because they are reviewed on an as-needed basis, a job posting will be removed once the position has been filled or is no longer available.

HALO is an equal opportunity employer. We celebrate diversity and are committed to creating an inclusive environment for all employees. We insist on an environment of mutual respect where equal employment opportunities are available to all applicants without regard to race, color, religion, sex, pregnancy (including childbirth, lactation and related medical conditions), national origin, age, physical and mental disability, marital status, sexual orientation, gender identity, gender expression, genetic information (including characteristics and testing), military and veteran status, and any other characteristic protected by applicable law. Inclusion is a core value at HALO and we seek to recruit, develop and retain the most talented people.

HALO participates in E-Verify. Please see the following notices in English and Spanish for important information: [E-Verify Participation](https://www.e-verify.gov/sites/default/files/everify/posters/EVerifyParticipationPoster.pdf) and [Right to Work](https://www.e-verify.gov/sites/default/files/everify/posters/IER_RightToWorkPoster%20Eng_Es.pdf).

HALO is committed to working with and providing reasonable accommodations to individuals with disabilities. If you need reasonable accommodation because of a disability for any part of the employment process, including the online application and/or overall selection process, you may email us at {{inquiryEmail}}.$jpseed$,
      $jpseed$- Bachelor's degree (BA) in marketing, communications, business or related field, or equivalent combination of experience and education
- 5+ years' experience in a creative B2B sales role
- Proficient in Microsoft applications (Word, Excel, Outlook and PowerPoint)
- Established prospecting and presentation skills and account management experience
- Some experience in or exposure to the promotional products industry is a major plus
- Excellent oral, written and interpersonal communication skills
- Strong business math experience
- Detail oriented, exceptional organizational skills and the ability to deliver under deadlines with a high level of accuracy
- Strong work ethic that supports working independently, under minimal supervision as well as the ability to work effectively in a collaborative team environment with a dynamic range of people
- Ability to handle sensitive situations with tact and well-reasoned judgment
- Proven ability to provide outstanding client service
- Curious, flexible with a positive "can do" attitude
- Ability to effectively provide, receive and respond positively to constructive feedback
- Willing to proactively seek out information, training and other resources needed to facilitate continual professional development necessary to be successful in this position
- Must be able to travel up to 6x a year$jpseed$,
      $jpseed$This position has a salary range of $60,000-$80,000, determined by an existing book of business brought to HALO or based on account(s) HALO plans to assign once employed. In addition to a competitive base salary, this role offers biweekly commission payments ranging from 9%-35% based on gross margin achieved. This range is a general guideline reflecting a broad spectrum of US labor markets; compensation decisions also account for the scope of the role, your experience, location, education, key skills, and internal and external market data.$jpseed$,
      $jpseed$At HALO, we offer benefits that support all aspects of your life, helping you find a work-life balance that's right for you. Our comprehensive benefits include nationwide coverage for Medical, Dental, Vision, Life, and Disability insurance, along with additional Voluntary Benefits. Prepare for your financial future with our 401(k) Retirement Savings Plan, Health Savings Accounts (HSA), and Flexible Spending Accounts (FSA).$jpseed$,
      'not_live'
    );
  end if;
end $$;

create table if not exists vendors (
  id serial primary key,
  name text not null default '',
  contact_name text not null default '',
  email text not null default '',
  phone text not null default '',
  address_name text not null default '',
  address_line1 text not null default '',
  address_line2 text not null default '',
  address_city text not null default '',
  address_state text not null default '',
  address_zip text not null default '',
  address_country text not null default 'US',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vendors_name_idx on vendors (lower(name));

create sequence if not exists purchase_order_number_seq;

create table if not exists purchase_orders (
  id serial primary key,
  po_number integer not null default 0,
  vendor_id integer references vendors(id) on delete set null,
  job_id integer references jobs(id) on delete set null,
  status text not null default 'draft' check (status in ('draft', 'sent', 'received', 'cancelled')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists purchase_orders_number_key on purchase_orders (po_number);
create index if not exists purchase_orders_vendor_idx on purchase_orders (vendor_id);
create index if not exists purchase_orders_job_idx on purchase_orders (job_id);
create index if not exists purchase_orders_status_idx on purchase_orders (status);

create table if not exists purchase_order_lines (
  id serial primary key,
  purchase_order_id integer not null references purchase_orders(id) on delete cascade,
  item_name text not null default '',
  description text not null default '',
  color text not null default '',
  size text not null default '',
  quantity integer not null default 0,
  unit_cost numeric(10, 2) not null default 0,
  sort_order integer not null default 0
);
create index if not exists purchase_order_lines_po_idx on purchase_order_lines (purchase_order_id, sort_order);

-- A purchase order can now cover goods for more than one job (one vendor
-- order split across jobs), so the links move from the single job_id
-- column above to this join table; job_id itself is left in place rather
-- than dropped, and this one-time copy carries over anything already set.
create table if not exists purchase_order_jobs (
  purchase_order_id integer not null references purchase_orders(id) on delete cascade,
  job_id integer not null references jobs(id) on delete cascade,
  primary key (purchase_order_id, job_id)
);
create index if not exists purchase_order_jobs_job_idx on purchase_order_jobs (job_id);
insert into purchase_order_jobs (purchase_order_id, job_id)
  select id, job_id from purchase_orders where job_id is not null
  on conflict do nothing;
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
