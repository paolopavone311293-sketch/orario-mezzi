import { Router } from 'express';
import { db } from '../db.js';

export const vehiclesRouter = Router();

vehiclesRouter.post('/', (req, res) => {
  const { name, zoneId } = req.body;
  if (!name || !name.trim() || !zoneId) {
    return res.status(400).json({ error: 'name and zoneId are required' });
  }
  const info = db.prepare('INSERT INTO vehicles (name, zone_id) VALUES (?, ?)').run(name.trim(), Number(zoneId));
  const vehicle = db
    .prepare('SELECT id, name, zone_id AS zoneId, in_repair AS inRepair FROM vehicles WHERE id = ?')
    .get(Number(info.lastInsertRowid));
  res.status(201).json(vehicle);
});

vehiclesRouter.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name, zoneId, inRepair } = req.body;
  const existing = db.prepare('SELECT id, name, zone_id AS zoneId, in_repair AS inRepair FROM vehicles WHERE id = ?').get(Number(id));
  if (!existing) return res.status(404).json({ error: 'not found' });
  const nextName = name !== undefined ? name.trim() : existing.name;
  const nextZoneId = zoneId !== undefined ? Number(zoneId) : existing.zoneId;
  const nextInRepair = inRepair !== undefined ? Number(inRepair) : existing.inRepair;
  db.prepare('UPDATE vehicles SET name = ?, zone_id = ?, in_repair = ? WHERE id = ?').run(nextName, nextZoneId, nextInRepair, Number(id));
  res.json({ id: Number(id), name: nextName, zoneId: nextZoneId, inRepair: nextInRepair });
});

vehiclesRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM vehicles WHERE id = ?').run(Number(id));
  res.status(204).send();
});
