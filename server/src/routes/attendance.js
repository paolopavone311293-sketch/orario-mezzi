import { Router } from 'express';
import { db } from '../db.js';

export const attendanceRouter = Router();

attendanceRouter.get('/', (req, res) => {
  const { start, end } = req.query;
  if (!start || !end) {
    return res.status(400).json({ error: 'start and end query params are required' });
  }
  const rows = db
    .prepare('SELECT person_id AS personId, date, status FROM attendance WHERE date BETWEEN ? AND ?')
    .all(start, end);
  res.json(rows);
});

attendanceRouter.put('/', (req, res) => {
  const { personId, date, status } = req.body;
  if (!personId || !date || !status) {
    return res.status(400).json({ error: 'personId, date and status are required' });
  }
  if (!['present', 'absent'].includes(status)) {
    return res.status(400).json({ error: 'status must be present or absent' });
  }
  db.prepare(
    `INSERT INTO attendance (person_id, date, status) VALUES (?, ?, ?)
     ON CONFLICT(person_id, date) DO UPDATE SET status = excluded.status`
  ).run(Number(personId), date, status);
  res.json({ personId: Number(personId), date, status });
});
