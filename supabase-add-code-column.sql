-- Aggiunge la colonna "code" (codice zona mostrato al posto del numero:
-- 1-43, LM44-50, LB51-68, LBC69) alle tabelle dei mezzi.
-- Eseguire nel progetto Supabase (SQL Editor -> Run).
-- Sicuro e retrocompatibile: colonna opzionale, l'app 1 la lascia vuota.

alter table public.vehicles      add column if not exists code text;
alter table public.app2_vehicles add column if not exists code text;
