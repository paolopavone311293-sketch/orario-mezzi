-- =====================================================================
-- Schema completo per la SECONDA app "Orario Ferie e Mezzi".
-- Esegui questo script UNA VOLTA nel NUOVO progetto Supabase:
--   Dashboard (nuovo progetto) -> SQL Editor -> New query -> incolla -> Run.
--
-- Ricrea le stesse tabelle dell'app esistente. Parte VUOTA (nessun mezzo,
-- nessuna persona), ma con le 4 zone gia' inserite: servono perche' l'app
-- aggiunge i mezzi dentro una zona.
-- =====================================================================

-- ---------- Tabelle ----------

create table if not exists public.people (
  id bigint generated always as identity primary key,
  name text not null,
  active boolean not null default true
);

create table if not exists public.zones (
  id bigint generated always as identity primary key,
  name text not null
);

create table if not exists public.vehicles (
  id bigint generated always as identity primary key,
  name text not null,
  zone_id bigint not null references public.zones(id) on delete cascade,
  in_repair boolean not null default false,
  position integer
);

create table if not exists public.attendance (
  id bigint generated always as identity primary key,
  person_id bigint not null references public.people(id) on delete cascade,
  date date not null,
  status text not null,
  unique (person_id, date)
);

create table if not exists public.assignments (
  id bigint generated always as identity primary key,
  date date not null,
  vehicle_id bigint not null references public.vehicles(id) on delete cascade,
  person_id bigint not null references public.people(id) on delete cascade,
  unique (date, vehicle_id, person_id)
);

create table if not exists public.vacations (
  id bigint generated always as identity primary key,
  person_id bigint not null references public.people(id) on delete cascade,
  date_start date not null,
  date_end date not null
);

create table if not exists public.notes (
  id bigint generated always as identity primary key,
  vehicle_id bigint not null references public.vehicles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- ---------- RLS + policy pubbliche (stesso comportamento dell'app attuale:
--            accesso in lettura/scrittura con la chiave pubblica) ----------

do $$
declare t text;
begin
  foreach t in array array['people','zones','vehicles','attendance','assignments','vacations','notes']
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "public access" on public.%I;', t);
    execute format('create policy "public access" on public.%I for all using (true) with check (true);', t);
  end loop;
end $$;

-- ---------- Dati iniziali: solo le 4 zone ----------

insert into public.zones (name) values
  ('Zona Nord'),
  ('Zona Sud'),
  ('Zona Centro'),
  ('Generale');
