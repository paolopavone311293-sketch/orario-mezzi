-- =====================================================================
-- SECONDA app "Orario Ferie e Mezzi" nello STESSO progetto Supabase.
-- Crea un set di tabelle separato con prefisso "app2_", cosi' i dati
-- (targhe, persone, ecc.) sono completamente indipendenti da quelli
-- dell'app attuale. Le tabelle originali (people, vehicles, ...) NON
-- vengono toccate.
--
-- Esegui UNA VOLTA nel progetto Supabase esistente:
--   Dashboard -> SQL Editor -> New query -> incolla -> Run.
-- =====================================================================

create table if not exists public.app2_people (
  id bigint generated always as identity primary key,
  name text not null,
  active boolean not null default true
);

create table if not exists public.app2_zones (
  id bigint generated always as identity primary key,
  name text not null
);

create table if not exists public.app2_vehicles (
  id bigint generated always as identity primary key,
  name text not null,
  zone_id bigint not null references public.app2_zones(id) on delete cascade,
  in_repair boolean not null default false,
  position integer
);

create table if not exists public.app2_attendance (
  id bigint generated always as identity primary key,
  person_id bigint not null references public.app2_people(id) on delete cascade,
  date date not null,
  status text not null,
  unique (person_id, date)
);

create table if not exists public.app2_assignments (
  id bigint generated always as identity primary key,
  date date not null,
  vehicle_id bigint not null references public.app2_vehicles(id) on delete cascade,
  person_id bigint not null references public.app2_people(id) on delete cascade,
  unique (date, vehicle_id, person_id)
);

create table if not exists public.app2_vacations (
  id bigint generated always as identity primary key,
  person_id bigint not null references public.app2_people(id) on delete cascade,
  date_start date not null,
  date_end date not null
);

create table if not exists public.app2_notes (
  id bigint generated always as identity primary key,
  vehicle_id bigint not null references public.app2_vehicles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- RLS + policy pubbliche (stesso accesso con la chiave pubblica)
do $$
declare t text;
begin
  foreach t in array array[
    'app2_people','app2_zones','app2_vehicles','app2_attendance',
    'app2_assignments','app2_vacations','app2_notes'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "public access" on public.%I;', t);
    execute format('create policy "public access" on public.%I for all using (true) with check (true);', t);
  end loop;
end $$;

-- Dati iniziali: solo le 4 zone (servono per poter aggiungere i mezzi)
insert into public.app2_zones (name) values
  ('Zona Nord'),
  ('Zona Sud'),
  ('Zona Centro'),
  ('Generale');
