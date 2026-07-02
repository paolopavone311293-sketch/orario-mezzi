# Orario Ferie e Mezzi

Web app per la gestione di presenze/ferie del personale e l'assegnazione dei mezzi per zona.

## Struttura

- `server/`: API REST (Node.js + Express + `node:sqlite`, dati in `server/data.sqlite`)
- `client/`: interfaccia (React + Vite + TypeScript)

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

Il server è pronto per un deploy a servizio singolo: se esiste `client/dist` (generata con `cd client && npm run build`), Express la serve direttamente, così frontend e API stanno sullo stesso dominio/porta e non serve configurare CORS o URL separati. Basta far girare `server/` (`npm start`, con `PORT` impostata dall'hosting) su un servizio Node qualsiasi (Railway, Render, Fly.io, VPS, ecc.) dopo aver fatto la build del client.
