import { Router } from 'express';
import { db } from '../db.js';

export const peopleRouter = Router();

peopleRouter.get('/', (req, res) => {
  const people = db.prepare('SELECT id, name, active FROM people ORDER BY id').all();
  res.json(people);
});

peopleRouter.post('/', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  const info = db.prepare('INSERT INTO people (name) VALUES (?)').run(name.trim());
  const person = db.prepare('SELECT id, name, active FROM people WHERE id = ?').get(Number(info.lastInsertRowid));
  res.status(201).json(person);
});

peopleRouter.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, active } = req.body;
  const existing = db.prepare('SELECT id, name, active FROM people WHERE id = ?').get(Number(id));
  if (!existing) return res.status(404).json({ error: 'not found' });
  const nextName = name !== undefined ? name.trim() : existing.name;
  const nextActive = active !== undefined ? (active ? 1 : 0) : existing.active;
  db.prepare('UPDATE people SET name = ?, active = ? WHERE id = ?').run(nextName, nextActive, Number(id));
  res.json({ id: Number(id), name: nextName, active: nextActive });
});

peopleRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM people WHERE id = ?').run(Number(id));
  res.status(204).send();
});
