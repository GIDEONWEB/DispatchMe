-- DispatchMe production schema for Supabase (Postgres).
-- Run in the Supabase SQL editor. Auth users come from Supabase Auth (auth.users).

create type user_role as enum ('customer', 'rider');
-- Riders submit -> 'pending'; an admin (or an ID/face-match provider) sets 'approved' / 'rejected'.
create type verification_status as enum ('unsubmitted', 'pending', 'approved', 'rejected');
create type delivery_status as enum ('requested', 'accepted', 'arrived', 'in_transit', 'delivered', 'cancelled');

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role user_role not null default 'customer',
  full_name text not null,
  phone text not null,
  created_at timestamptz not null default now()
);

create table riders (
  id uuid primary key references profiles(id) on delete cascade,
  plate_number text,
  license_number text,
  nin text,                         -- encrypt at rest (pgsodium / Vault) before launch
  live_photo_path text,             -- Storage paths (private bucket `rider-docs`)
  license_photo_path text,
  bike_doc_paths text[] default '{}',
  verification verification_status not null default 'unsubmitted',
  is_online boolean not null default false,
  lat double precision,             -- last known position (updated by rider app while online)
  lng double precision,
  location_updated_at timestamptz,
  check (not is_online or verification = 'approved')
);

create table deliveries (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references profiles(id),
  rider_id uuid references riders(id),
  status delivery_status not null default 'requested',
  pickup_area text not null, pickup_address text not null, pickup_lat double precision not null, pickup_lng double precision not null,
  dest_area text not null,   dest_address text not null,   dest_lat double precision not null,   dest_lng double precision not null,
  route_polyline text,              -- encoded Google route (Routes API), used to draw the road path
  package_type text not null,
  recipient_name text not null, recipient_phone text not null, note text,
  distance_km numeric(6,1) not null,
  price integer not null,           -- NGN, computed server-side (see rpc below)
  rider_earning integer not null,
  created_at timestamptz not null default now(),
  accepted_at timestamptz, arrived_at timestamptz, picked_up_at timestamptz,
  delivered_at timestamptz, cancelled_at timestamptz
);
create index on deliveries (status, created_at);
create index on deliveries (customer_id, created_at desc);
create index on deliveries (rider_id, created_at desc);
-- one active delivery per customer / per rider
create unique index one_active_per_customer on deliveries (customer_id) where status in ('requested','accepted','arrived','in_transit');
create unique index one_active_per_rider on deliveries (rider_id) where status in ('accepted','arrived','in_transit');

create table ratings (
  delivery_id uuid primary key references deliveries(id) on delete cascade,
  rider_id uuid not null references riders(id),
  customer_id uuid not null references profiles(id),
  stars smallint not null check (stars between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

create view rider_stats as
  select rider_id, round(avg(stars)::numeric, 1) as avg_rating, count(*) as rating_count
  from ratings group by rider_id;

-- Atomic "first rider wins" accept. Call from the rider app: supabase.rpc('accept_delivery', { p_id })
create or replace function accept_delivery(p_id uuid) returns deliveries
language plpgsql security definer as $$
declare d deliveries;
begin
  if not exists (select 1 from riders where id = auth.uid() and verification = 'approved' and is_online) then
    raise exception 'Rider must be approved and online';
  end if;
  update deliveries set status = 'accepted', rider_id = auth.uid(), accepted_at = now()
   where id = p_id and status = 'requested' returning * into d;
  if d.id is null then raise exception 'Request no longer available'; end if;
  return d;
end $$;

-- Row Level Security
alter table profiles enable row level security;
alter table riders enable row level security;
alter table deliveries enable row level security;
alter table ratings enable row level security;

create policy "own profile" on profiles for select using (id = auth.uid());
create policy "own profile update" on profiles for update using (id = auth.uid());
create policy "rider sees own row" on riders for select using (id = auth.uid());
create policy "rider edits own row" on riders for update using (id = auth.uid()) with check (id = auth.uid());
create policy "customer creates delivery" on deliveries for insert with check (customer_id = auth.uid() and status = 'requested');
create policy "customer reads own" on deliveries for select using (customer_id = auth.uid());
create policy "rider reads own or open" on deliveries for select using (
  rider_id = auth.uid() or (status = 'requested' and exists (select 1 from riders where id = auth.uid() and is_online and verification = 'approved')));
create policy "rider updates own" on deliveries for update using (rider_id = auth.uid());
create policy "customer cancels own" on deliveries for update using (customer_id = auth.uid() and status in ('requested','accepted'));
create policy "customer rates own" on ratings for insert with check (customer_id = auth.uid());
create policy "ratings readable" on ratings for select using (true);

-- Realtime: enable for `deliveries` and `riders` (Database > Replication) so the customer map and
-- rider request list update live.
-- Storage: create a PRIVATE bucket `rider-docs`; allow insert/select only for path prefix = auth.uid().
