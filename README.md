# Orario Ferie e Mezzi

Web app per la gestione di presenze/ferie del personale e l'assegnazione dei mezzi per zona.

## Struttura

- `server/`: API REST (Node.js + Express)
- `client/`: interfaccia (React + Vite + TypeScript)
- **Database:** Supabase PostgreSQL (cloud) - nessun file SQLite locale

## Avvio in locale

In due terminali separati:

```
cd server
npm install
npm run dev
```

```
cd client
npm install
npm run dev
```

L'app è raggiungibile su http://localhost:5173 (il frontend inoltra le chiamate `/api` al backend sulla porta 3001).

## Deploy online

**Configurazione:**
- Database: Supabase PostgreSQL (URL: https://zltsdiaefuokeuuwdxfp.supabase.co)
- Credenziali: configurate in `.env.production`

**Opzioni di deploy:**

1. **Frontend (React)** - Vercel/Netlify/GitHub Pages
   - Build: `cd client && npm run build`
   - Deploy di `client/dist` su Vercel/Netlify
   - Si connette direttamente a Supabase via SDK

2. **Backend (optional)** - Railway/Render/Fly.io
   - Se esiste `client/dist`, Express la serve
   - Backend e frontend sullo stesso dominio (no CORS necessario)
