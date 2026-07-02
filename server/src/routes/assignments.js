import { Router } from 'express';
import { db } from '../db.js';

export const assignmentsRouter = Router();

assignmentsRouter.get('/', (req, res) => {
  const { date } = req.query;
  if (!date) {
    return res.status(400).json({ error: 'date query param is required' });
  }
  const rows = db
    .prepare('SELECT id, vehicle_id AS vehicleId, person_id AS personId FROM assignments WHERE date = ?')
    .all(date);
  res.json(rows);
});

assignmentsRouter.post('/', (req, res) => {
  const { date, vehicleId, personId } = req.body;
  if (!date || !vehicleId || !personId) {
    return res.status(400).json({ error: 'date, vehicleId and personId are required' });
  }
  try {
    const info = db
      .prepare('INSERT INTO assignments (date, vehicle_id, person_id) VALUES (?, ?, ?)')
      .run(date, Number(vehicleId), Number(personId));
    res.status(201).json({ id: Number(info.lastInsertRowid), date, vehicleId: Number(vehicleId), personId: Number(personId) });
  } catch (err) {
    if (String(err.message).includes('UNIQUE')) {
      return res.status(409).json({ error: 'already assigned' });
    }
    throw err;
  }
});

assignmentsRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM assignments WHERE id = ?').run(Number(id));
  res.status(204).send();
});
