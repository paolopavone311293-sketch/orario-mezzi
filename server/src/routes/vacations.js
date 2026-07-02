import { Router } from 'express';
import { db } from '../db.js';

export const vacationsRouter = Router();

vacationsRouter.get('/', (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) {
    return res.status(400).json({ error: 'start and end query params are required' });
  }
  const rows = db
    .prepare(
      `SELECT id, person_id AS personId, date_start AS dateStart, date_end AS dateEnd
       FROM vacations
       WHERE (date_start <= ? AND date_end >= ?) OR (date_start BETWEEN ? AND ?) OR (date_end BETWEEN ? AND ?)
       ORDER BY date_start`
    )
    .all(end, start, start, end, start, end);
  res.json(rows);
});

vacationsRouter.get('/person/:personId', (req, res) => {
  const { personId } = req.params;
  const rows = db
    .prepare('SELECT id, person_id AS personId, date_start AS dateStart, date_end AS dateEnd FROM vacations WHERE person_id = ? ORDER BY date_start DESC')
    .all(Number(personId));
  res.json(rows);
});

vacationsRouter.post('/', (req, res) => {
  const { personId, dateStart, dateEnd } = req.body;
  if (!personId || !dateStart || !dateEnd) {
    return res.status(400).json({ error: 'personId, dateStart, and dateEnd are required' });
  }
  const info = db
    .prepare('INSERT INTO vacations (person_id, date_start, date_end) VALUES (?, ?, ?)')
    .run(Number(personId), dateStart, dateEnd);
  res.status(201).json({
    id: Number(info.lastInsertRowid),
    personId: Number(personId),
    dateStart,
    dateEnd,
  });
});

vacationsRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM vacations WHERE id = ?').run(Number(id));
  res.status(204).send();
});
