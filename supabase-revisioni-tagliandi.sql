-- =====================================================================
-- Tabelle per le pagine "Revisioni" e "Tagliandi".
--   revisioni: scadenza (data) + km per mezzo
--   tagliandi: km attuali + tipo mezzo (motorino/auto); i km limite sono
--              impostazioni globali salvate nella tabella settings
-- Una riga per mezzo (vehicle_id = primary key). Vale per tutte e 3 le app:
--   nessun prefisso = Santa Croce, app2_ = Pisa, app3_ = Livorno.
--
-- Esegui UNA VOLTA nel progetto Supabase (SQL Editor -> Run).
-- Se compare l'avviso RLS, clicca "Run without RLS" (lo script gestisce RLS+policy).
-- =====================================================================

-- ---------- Santa Croce ----------
create table if not exists public.revisioni (
  vehicle_id bigint primary key references public.vehicles(id) on delete cascade,
  scadenza date,
  km integer,
  tipo text
);
create table if not exists public.tagliandi (
  vehicle_id bigint primary key references public.vehicles(id) on delete cascade,
  scadenza date,
  km integer,
  tipo text
);
create table if not exists public.settings (
  key text primary key,
  value text
);

-- ---------- Pisa (app2_) ----------
create table if not exists public.app2_revisioni (
  vehicle_id bigint primary key references public.app2_vehicles(id) on delete cascade,
  scadenza date,
  km integer,
  tipo text
);
create table if not exists public.app2_tagliandi (
  vehicle_id bigint primary key references public.app2_vehicles(id) on delete cascade,
  scadenza date,
  km integer,
  tipo text
);
create table if not exists public.app2_settings (
  key text primary key,
  value text
);

-- ---------- Livorno (app3_) ----------
create table if not exists public.app3_revisioni (
  vehicle_id bigint primary key references public.app3_vehicles(id) on delete cascade,
  scadenza date,
  km integer,
  tipo text
);
create table if not exists public.app3_tagliandi (
  vehicle_id bigint primary key references public.app3_vehicles(id) on delete cascade,
  scadenza date,
  km integer,
  tipo text
);
create table if not exists public.app3_settings (
  key text primary key,
  value text
);

-- ---------- RLS + policy pubbliche ----------
do $$
declare t text;
begin
  foreach t in array array[
    'revisioni','tagliandi','settings',
    'app2_revisioni','app2_tagliandi','app2_settings',
    'app3_revisioni','app3_tagliandi','app3_settings'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists "public access" on public.%I;', t);
    execute format('create policy "public access" on public.%I for all using (true) with check (true);', t);
  end loop;
end $$;

-- ---------- Km limite di default (modificabili dall'app) ----------
insert into public.settings (key, value) values
  ('tagliandi_limite_motorino', '5000'),
  ('tagliandi_limite_auto', '20000')
on conflict (key) do nothing;

insert into public.app2_settings (key, value) values
  ('tagliandi_limite_motorino', '5000'),
  ('tagliandi_limite_auto', '20000')
on conflict (key) do nothing;

insert into public.app3_settings (key, value) values
  ('tagliandi_limite_motorino', '5000'),
  ('tagliandi_limite_auto', '20000')
on conflict (key) do nothing;
