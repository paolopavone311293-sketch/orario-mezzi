# Orario Ferie e Mezzi

Web app per gestione presenze/ferie e assegnazione mezzi per zona.

## Stack
- **Backend:** Node.js + Express + SQLite (`server/data.sqlite`)
- **Frontend:** React + Vite + TypeScript

## Architettura
- `server/`: API REST sulla porta 3001
- `client/`: SPA sulla porta 5173
- Frontend inoltra `/api/*` al backend (no CORS necessario localmente)

## Deploy
Build client con `npm run build` → Express serve `client/dist` → singolo servizio Node.js

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
