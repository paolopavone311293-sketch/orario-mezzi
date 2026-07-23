-- Tabella per la funzione "Note" (una nota per targa/mezzo).
-- Esegui questo script UNA VOLTA nel pannello Supabase:
--   Dashboard → SQL Editor → New query → incolla → Run.

create table if not exists public.notes (
  id bigint generated always as identity primary key,
  vehicle_id bigint not null references public.vehicles(id) on delete cascade,
  text text not null,
  created_at timestamptz not null default now()
);

-- Abilita RLS e consenti l'accesso con la chiave pubblica dell'app
-- (stesso comportamento delle altre tabelle: lettura/scrittura pubblica).
alter table public.notes enable row level security;

drop policy if exists "notes public access" on public.notes;
create policy "notes public access"
  on public.notes
  for all
  using (true)
  with check (true);
