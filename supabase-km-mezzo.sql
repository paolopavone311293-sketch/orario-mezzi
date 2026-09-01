-- =====================================================================
-- Km del mezzo condivisi tra le pagine Revisioni e Tagliandi.
-- I km diventano una proprietà del mezzo (una sola volta), così scrivendoli
-- in una pagina si aggiornano automaticamente anche nell'altra.
--
-- Esegui UNA VOLTA nel progetto Supabase (SQL Editor -> Run).
-- Sicuro: aggiunge solo una colonna opzionale, non tocca i dati esistenti.
-- =====================================================================

alter table public.vehicles      add column if not exists km integer;
alter table public.app2_vehicles add column if not exists km integer;
alter table public.app3_vehicles add column if not exists km integer;
