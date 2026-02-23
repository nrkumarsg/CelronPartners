-- Create tables for Universal Finder
create table if not exists searches (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid,
  query text not null,
  source text not null,
  total_results int default 0,
  created_at timestamp default now()
);

create table if not exists search_results (
  id uuid primary key default uuid_generate_v4(),
  search_id uuid references searches(id) on delete cascade,
  title text,
  url text,
  snippet text,
  thumbnail_url text,
  supplier_name text,
  supplier_location text,
  email text,
  phone text,
  latitude double precision,
  longitude double precision,
  distance_km double precision,
  rank int,
  saved_to_partner boolean default false,
  created_at timestamp default now()
);

create table if not exists geocode_cache (
  supplier_name text primary key,
  lat double precision,
  lng double precision,
  fetched_at timestamp default now()
);

alter table partners add column if not exists latitude double precision;
alter table partners add column if not exists longitude double precision;
alter table partners add column if not exists source_search_id uuid references searches(id);
