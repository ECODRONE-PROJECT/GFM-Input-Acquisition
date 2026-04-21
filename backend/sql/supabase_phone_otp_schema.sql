-- Run this in Supabase SQL Editor before using the OTP endpoints.

create extension if not exists pgcrypto;

create table if not exists public.phone_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  phone text not null,
  otp_hash text not null,
  attempts integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  consumed_at timestamptz null
);

create index if not exists idx_phone_otp_user_phone_created
  on public.phone_otp_challenges (user_id, phone, created_at desc);

create table if not exists public.user_phone_verifications (
  user_id text primary key,
  phone text not null,
  verified_at timestamptz not null,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.admin_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  admin_email text not null,
  otp_hash text not null,
  attempts integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  consumed_at timestamptz null
);

create index if not exists idx_admin_otp_email_created
  on public.admin_otp_challenges (admin_email, created_at desc);

-- Recommended: keep OTP tables backend-only through service role.
alter table public.phone_otp_challenges enable row level security;
alter table public.user_phone_verifications enable row level security;
alter table public.admin_otp_challenges enable row level security;

drop policy if exists "service role can manage otp challenges" on public.phone_otp_challenges;
create policy "service role can manage otp challenges"
  on public.phone_otp_challenges
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role can manage phone verification states" on public.user_phone_verifications;
create policy "service role can manage phone verification states"
  on public.user_phone_verifications
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role can manage admin otp challenges" on public.admin_otp_challenges;
create policy "service role can manage admin otp challenges"
  on public.admin_otp_challenges
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.aggregate_deals (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text null,
  deal_type text not null check (deal_type in ('bulk', 'auction')),
  item_name text not null,
  item_category text null,
  unit text null,
  image_url text null,
  base_price numeric(12, 2) not null default 0,
  discount_percent numeric(5, 2) not null default 0,
  deal_price numeric(12, 2) not null default 0,
  target_quantity integer null,
  current_quantity integer not null default 0,
  min_join_quantity integer not null default 1,
  max_join_quantity integer null,
  starting_bid numeric(12, 2) null,
  highest_bid numeric(12, 2) null,
  highest_bidder text null,
  winner_user_id text null,
  winning_bid numeric(12, 2) null,
  start_at timestamptz null,
  end_at timestamptz null,
  status text not null default 'active'
    check (status in ('draft', 'active', 'closed', 'cancelled')),
  created_by text null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_aggregate_deals_status_created
  on public.aggregate_deals (status, created_at desc);

create index if not exists idx_aggregate_deals_type_status
  on public.aggregate_deals (deal_type, status, end_at);

create table if not exists public.aggregate_deal_participants (
  id uuid primary key default gen_random_uuid(),
  deal_id uuid not null references public.aggregate_deals(id) on delete cascade,
  user_id text not null,
  join_type text not null check (join_type in ('bulk_join', 'auction_bid')),
  quantity integer null,
  bid_amount numeric(12, 2) null,
  note text null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_aggregate_participants_deal_created
  on public.aggregate_deal_participants (deal_id, created_at desc);

create index if not exists idx_aggregate_participants_user_created
  on public.aggregate_deal_participants (user_id, created_at desc);

alter table public.aggregate_deals enable row level security;
alter table public.aggregate_deal_participants enable row level security;

drop policy if exists "service role can manage aggregate deals" on public.aggregate_deals;
create policy "service role can manage aggregate deals"
  on public.aggregate_deals
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role can manage aggregate deal participants" on public.aggregate_deal_participants;
create policy "service role can manage aggregate deal participants"
  on public.aggregate_deal_participants
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.payment_intents (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  provider text not null default 'paystack',
  status text not null default 'initialized',
  user_id text not null,
  email text not null,
  address text not null,
  total_amount numeric(12, 2) not null,
  cash_component numeric(12, 2) not null,
  credit_applied numeric(12, 2) not null default 0,
  credit_score integer null,
  credit_limit numeric(12, 2) null,
  items jsonb not null default '[]'::jsonb,
  provider_access_code text null,
  provider_authorization_url text null,
  provider_status text null,
  provider_payload jsonb null,
  verify_payload jsonb null,
  order_id text null,
  paid_at timestamptz null,
  completed_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_payment_intents_reference
  on public.payment_intents(reference);

create index if not exists idx_payment_intents_user_created
  on public.payment_intents(user_id, created_at desc);

alter table public.payment_intents enable row level security;

drop policy if exists "service role can manage payment intents" on public.payment_intents;
create policy "service role can manage payment intents"
  on public.payment_intents
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create table if not exists public.order_tracking (
  id uuid primary key default gen_random_uuid(),
  order_id text not null unique,
  user_id text not null,
  status text not null default 'order_placed',
  status_label text null,
  delivery_address text null,
  payment_provider text null,
  payment_reference text null,
  payment_status text null,
  total_amount numeric(12, 2) not null default 0,
  credit_applied numeric(12, 2) not null default 0,
  cash_component numeric(12, 2) not null default 0,
  estimated_delivery_at timestamptz null,
  updated_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_order_tracking_user_created
  on public.order_tracking(user_id, created_at desc);

create table if not exists public.order_tracking_events (
  id uuid primary key default gen_random_uuid(),
  order_id text not null,
  user_id text not null,
  event_type text not null,
  status text null,
  note text not null,
  event_time timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_order_tracking_events_order_time
  on public.order_tracking_events(order_id, event_time desc);

create index if not exists idx_order_tracking_events_user_time
  on public.order_tracking_events(user_id, event_time desc);

alter table public.order_tracking enable row level security;
alter table public.order_tracking_events enable row level security;

drop policy if exists "service role can manage order tracking" on public.order_tracking;
create policy "service role can manage order tracking"
  on public.order_tracking
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role can manage order tracking events" on public.order_tracking_events;
create policy "service role can manage order tracking events"
  on public.order_tracking_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Credit application + account management tables
create table if not exists public.credit_applications (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  farmer_id integer null,
  consent_credit_assessment boolean not null default false,
  application_payload jsonb not null default '{}'::jsonb,
  component_scores jsonb not null default '{}'::jsonb,
  weighted_scores jsonb not null default '{}'::jsonb,
  weights jsonb not null default '{}'::jsonb,
  final_score numeric(6, 2) not null default 0,
  creditworthiness text null,
  suggested_credit_limit numeric(12, 2) not null default 0,
  approved_credit_limit numeric(12, 2) null,
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'pending_documents', 'approved', 'rejected')),
  reviewer text null,
  review_note text null,
  submitted_at timestamptz not null default timezone('utc', now()),
  reviewed_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_credit_applications_user_created
  on public.credit_applications (user_id, created_at desc);

create index if not exists idx_credit_applications_status_created
  on public.credit_applications (status, created_at desc);

create table if not exists public.credit_application_documents (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.credit_applications(id) on delete cascade,
  user_id text not null,
  document_type text not null default 'supporting_document',
  original_name text not null,
  stored_name text not null,
  storage_path text not null,
  mime_type text null,
  size_bytes bigint not null default 0,
  uploaded_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_credit_docs_application_uploaded
  on public.credit_application_documents (application_id, uploaded_at desc);

create table if not exists public.credit_application_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.credit_applications(id) on delete cascade,
  user_id text not null,
  event_type text not null,
  note text not null,
  metadata jsonb not null default '{}'::jsonb,
  event_time timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_credit_events_application_time
  on public.credit_application_events (application_id, event_time desc);

create table if not exists public.credit_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id text not null unique,
  status text not null default 'submitted'
    check (status in ('submitted', 'under_review', 'pending_documents', 'approved', 'rejected', 'suspended')),
  assigned_credit_limit numeric(12, 2) not null default 0,
  available_credit numeric(12, 2) not null default 0,
  consumed_credit numeric(12, 2) not null default 0,
  last_score numeric(6, 2) not null default 0,
  creditworthiness text null,
  last_application_id uuid null references public.credit_applications(id) on delete set null,
  reviewer text null,
  approved_at timestamptz null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.credit_accounts add column if not exists status text not null default 'submitted';
alter table public.credit_accounts add column if not exists assigned_credit_limit numeric(12, 2) not null default 0;
alter table public.credit_accounts add column if not exists available_credit numeric(12, 2) not null default 0;
alter table public.credit_accounts add column if not exists consumed_credit numeric(12, 2) not null default 0;
alter table public.credit_accounts add column if not exists last_score numeric(6, 2) not null default 0;
alter table public.credit_accounts add column if not exists creditworthiness text null;
alter table public.credit_accounts add column if not exists last_application_id uuid null references public.credit_applications(id) on delete set null;
alter table public.credit_accounts add column if not exists reviewer text null;
alter table public.credit_accounts add column if not exists approved_at timestamptz null;
alter table public.credit_accounts add column if not exists created_at timestamptz not null default timezone('utc', now());
alter table public.credit_accounts add column if not exists updated_at timestamptz not null default timezone('utc', now());

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'credit_accounts'
      and column_name = 'assigned_limit'
  ) then
    update public.credit_accounts
    set
      assigned_credit_limit = greatest(coalesce(assigned_credit_limit, 0), coalesce(assigned_limit, 0)),
      consumed_credit = greatest(coalesce(consumed_credit, 0), coalesce(outstanding_balance, 0)),
      available_credit = greatest(
        coalesce(assigned_credit_limit, coalesce(assigned_limit, 0))
        - coalesce(consumed_credit, coalesce(outstanding_balance, 0)),
        0
      ),
      status = case
        when coalesce(assigned_limit, 0) > 0 then 'approved'
        else coalesce(status, 'submitted')
      end,
      updated_at = timezone('utc', now());
  end if;
end $$;

create index if not exists idx_credit_accounts_status_updated
  on public.credit_accounts (status, updated_at desc);

alter table public.credit_applications enable row level security;
alter table public.credit_application_documents enable row level security;
alter table public.credit_application_events enable row level security;
alter table public.credit_accounts enable row level security;

drop policy if exists "service role can manage credit applications" on public.credit_applications;
create policy "service role can manage credit applications"
  on public.credit_applications
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role can manage credit application documents" on public.credit_application_documents;
create policy "service role can manage credit application documents"
  on public.credit_application_documents
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role can manage credit application events" on public.credit_application_events;
create policy "service role can manage credit application events"
  on public.credit_application_events
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role can manage credit accounts" on public.credit_accounts;
create policy "service role can manage credit accounts"
  on public.credit_accounts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
