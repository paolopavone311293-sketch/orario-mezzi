# Orario Ferie e Mezzi

Web app per gestione presenze/ferie e assegnazione mezzi per zona.

## Stack
- **Backend:** Node.js + Express
- **Frontend:** React + Vite + TypeScript
- **Database:** Supabase PostgreSQL (cloud)

## Architettura
- `server/`: API REST sulla porta 3001
- `client/`: SPA sulla porta 5173
- **Database:** Supabase PostgreSQL online
  - URL: https://zltsdiaefuokeuuwdxfp.supabase.co
  - Tabelle: people, attendance, zones, vehicles, assignments, vacations
- Frontend e backend si connettono direttamente a Supabase via SDK

## Deploy
Build client con `npm run build` → Express serve `client/dist` → singolo servizio Node.js
- Il frontend si connette direttamente a Supabase, nessun backend API necessario per l'accesso ai dati

## Feature Principali

### Presenze / Assenze
- Toggle P/A per ogni persona e giorno (settimana lavorativa)
- Stato "A" (assente) **segue le stesse regole delle ferie**: rimuove le assegnazioni mezzi del giorno e sospende il default
- **Modifica Nomi** attivabile da Impostazioni → cliccare sui nomi per rinominarli
- Con Modifica Nomi disattivata: nascosti sia il modulo "Aggiungi persona" sia i pulsanti ✕ di rimozione
- Navigazione settimana con frecce ‹ › grandi e data centrale, tutto su un'unica riga

### Zone e Mezzi
- Assegnazione persone ai 34 mezzi organizzati per zona
- Assegnazioni fisse (default) che tornano ogni giorno se la persona non è in ferie/assente
- Tasto **"Domani"** per saltare al giorno successivo (salta la domenica se necessario)
- **Modifica Targhe** attivabile da Impostazioni

### Riparazioni
- Gestione stato riparazione dei mezzi
- **Data inizio automatica** quando si mette un mezzo in riparazione (oggi)
- Numero di riparazioni nel titolo: "Riparazioni (N)"
- Assegnazioni automaticamente rimosse quando un mezzo entra in riparazione

### Ferie
- Gestione periodi di ferie per persona
- Rimuove le assegnazioni mezzi per la durata del periodo
- Date visualizzate in formato compatto gg/mm/aa

### Impostazioni
- 🎨 **Tema**: modalità chiara/scura
- 🚗 **Mezzi**: attiva/disattiva modifica targhe
- 👥 **Persone**: attiva/disattiva modifica nomi
- 📊 **Esporta Dati**: scarica foglio Excel con assegnazioni odierne

## Comandi

**Development (due terminali):**
```bash
cd server && npm install && npm run dev  # porta 3001
cd client && npm install && npm run dev  # porta 5173
```

**Build e test:**
```bash
cd client && npm run build   # genera dist/
npm run preview              # testa il build localmente
```
