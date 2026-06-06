-- Supabase SQL schema untuk Location-Based Smart Tourism
-- Jalankan skrip ini dalam Supabase SQL Editor.

create schema if not exists extensions;
create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

-- Jadual security_keys untuk OTP sekali guna selama 5 minit.
create table if not exists public.security_keys (
  id serial primary key,
  access_key varchar unique not null,
  is_used boolean not null default false,
  created_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists idx_security_keys_created_at
  on public.security_keys (created_at desc);

-- Jadual sesi pelawat: simpan nama semasa login dan komen sebelum logout.
create table if not exists public.visitor_sessions (
  id uuid primary key default extensions.gen_random_uuid(),
  session_token text unique not null,
  access_key text not null,
  visitor_name varchar(80) not null,
  visit_comment text,
  system_comment text,
  feedback_submitted_at timestamptz,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint visitor_sessions_name_not_blank
    check (char_length(trim(visitor_name)) >= 2),
  constraint visitor_sessions_visit_comment_length
    check (visit_comment is null or char_length(visit_comment) <= 1000),
  constraint visitor_sessions_system_comment_length
    check (system_comment is null or char_length(system_comment) <= 1000)
);

create index if not exists idx_visitor_sessions_created_at
  on public.visitor_sessions (created_at desc);

create index if not exists idx_visitor_sessions_feedback_submitted_at
  on public.visitor_sessions (feedback_submitted_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$;

drop trigger if exists trg_visitor_sessions_updated_at on public.visitor_sessions;
create trigger trg_visitor_sessions_updated_at
before update on public.visitor_sessions
for each row
execute function public.set_updated_at();

-- Jadual destinasi dengan sokongan geospatial PostGIS.
create table if not exists public.destinasi (
  id serial primary key,
  nama varchar not null,
  penerangan text,
  senarai_gambar text[] default array[]::text[],
  senarai_video text[] default array[]::text[],
  koordinat extensions.geography(Point, 4326)
);

create index if not exists idx_destinasi_koordinat
  on public.destinasi
  using gist (koordinat);

alter table public.security_keys enable row level security;
alter table public.visitor_sessions enable row level security;
alter table public.destinasi enable row level security;

-- Supabase Data API kini memerlukan grant eksplisit untuk projek tertentu.
grant usage on schema public to anon, authenticated;
grant usage on schema extensions to anon, authenticated;
grant select on public.security_keys to anon, authenticated;
grant update (is_used) on public.security_keys to anon, authenticated;
grant select, insert on public.visitor_sessions to anon, authenticated;
grant update (visit_comment, system_comment, feedback_submitted_at) on public.visitor_sessions to anon, authenticated;
grant select on public.destinasi to anon, authenticated;

drop policy if exists "security_keys_select_for_backend" on public.security_keys;
create policy "security_keys_select_for_backend"
on public.security_keys
for select
to anon, authenticated
using (true);

drop policy if exists "security_keys_mark_used_for_backend" on public.security_keys;
create policy "security_keys_mark_used_for_backend"
on public.security_keys
for update
to anon, authenticated
using (true)
with check (is_used = true);

drop policy if exists "visitor_sessions_select_for_backend" on public.visitor_sessions;
create policy "visitor_sessions_select_for_backend"
on public.visitor_sessions
for select
to anon, authenticated
using (true);

drop policy if exists "visitor_sessions_insert_for_backend" on public.visitor_sessions;
create policy "visitor_sessions_insert_for_backend"
on public.visitor_sessions
for insert
to anon, authenticated
with check (true);

drop policy if exists "visitor_sessions_update_feedback_for_backend" on public.visitor_sessions;
create policy "visitor_sessions_update_feedback_for_backend"
on public.visitor_sessions
for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "destinasi_read_for_geofence" on public.destinasi;
create policy "destinasi_read_for_geofence"
on public.destinasi
for select
to anon, authenticated
using (true);

-- Fungsi RPC untuk semakan geofence berdasarkan lokasi pengguna.
-- ST_DWithin menggunakan index GiST geography sebelum jarak sebenar dikira.
create or replace function public.semak_geofence(
  user_long float,
  user_lat float,
  max_radius_meter float
)
returns table (
  id integer,
  nama varchar,
  penerangan text,
  senarai_gambar text[],
  senarai_video text[],
  longitude float,
  latitude float,
  jarak_meter float
)
language sql
stable
set search_path = ''
as $$
  with lokasi_pengguna as (
    select extensions.st_setsrid(
      extensions.st_makepoint(user_long, user_lat),
      4326
    )::extensions.geography as titik
  )
  select
    d.id,
    d.nama,
    d.penerangan,
    coalesce(d.senarai_gambar, array[]::text[]) as senarai_gambar,
    coalesce(d.senarai_video, array[]::text[]) as senarai_video,
    extensions.st_x(d.koordinat::extensions.geometry)::float as longitude,
    extensions.st_y(d.koordinat::extensions.geometry)::float as latitude,
    extensions.st_distance(d.koordinat, l.titik)::float as jarak_meter
  from public.destinasi d
  cross join lokasi_pengguna l
  where d.koordinat is not null
    and extensions.st_dwithin(d.koordinat, l.titik, max_radius_meter)
  order by d.koordinat operator(extensions.<->) l.titik;
$$;

grant execute on function public.semak_geofence(
  double precision,
  double precision,
  double precision
) to anon, authenticated;

-- Jadual Media Sosial
create table if not exists public.social_media_links (
  id serial primary key,
  platform varchar(50) not null,
  url text not null,
  icon_name varchar(50),
  is_active boolean default true,
  created_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.social_media_links enable row level security;
grant select on public.social_media_links to anon, authenticated;

drop policy if exists "social_media_read_for_all" on public.social_media_links;
create policy "social_media_read_for_all"
on public.social_media_links
for select
to anon, authenticated
using (is_active = true);

-- Insert dummy data if table is empty
insert into public.social_media_links (platform, url, icon_name)
select * from (values
  ('Instagram', 'https://instagram.com/pangkor', 'instagram'),
  ('Threads', 'https://threads.net/@pangkor', 'threads'),
  ('TikTok', 'https://tiktok.com/@pangkor', 'tiktok'),
  ('Facebook', 'https://facebook.com/pangkor', 'facebook')
) as t(platform, url, icon_name)
where not exists (select 1 from public.social_media_links)
on conflict do nothing;
