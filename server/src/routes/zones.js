import { Router } from 'express';
import { db } from '../db.js';

export const zonesRouter = Router();

zonesRouter.get('/', (req, res) => {
  const zones = db.prepare('SELECT id, name FROM zones ORDER BY name').all();
  const vehicles = db.prepare('SELECT id, name, zone_id AS zoneId, in_repair AS inRepair FROM vehicles ORDER BY name').all();
  const result = zones.map((zone) => ({
    ...zone,
    vehicles: vehicles.filter((v) => v.zoneId === zone.id),
  }));
  res.json(result);
});

zonesRouter.post('/', (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'name is required' });
  }
  const info = db.prepare('INSERT INTO zones (name) VALUES (?)').run(name.trim());
  const zone = db.prepare('SELECT id, name FROM zones WHERE id = ?').get(Number(info.lastInsertRowid));
  res.status(201).json({ ...zone, vehicles: [] });
});

zonesRouter.put('/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  const existing = db.prepare('SELECT id FROM zones WHERE id = ?').get(Number(id));
  if (!existing) return res.status(404).json({ error: 'not found' });
  db.prepare('UPDATE zones SET name = ? WHERE id = ?').run(name.trim(), Number(id));
  res.json({ id: Number(id), name: name.trim() });
});

zonesRouter.delete('/:id', (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM zones WHERE id = ?').run(Number(id));
  res.status(204).send();
});
