import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import './db.js';
import { peopleRouter } from './routes/people.js';
import { attendanceRouter } from './routes/attendance.js';
import { zonesRouter } from './routes/zones.js';
import { vehiclesRouter } from './routes/vehicles.js';
import { assignmentsRouter } from './routes/assignments.js';
import { vacationsRouter } from './routes/vacations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/people', peopleRouter);
app.use('/api/attendance', attendanceRouter);
app.use('/api/zones', zonesRouter);
app.use('/api/vehicles', vehiclesRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/vacations', vacationsRouter);

// Se presente una build del client (client/dist), la serve dallo stesso
// server: comodo per un deploy a servizio unico, senza CORS da configurare.
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
