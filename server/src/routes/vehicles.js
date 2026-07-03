import { Router } from 'express';
import { supabase } from '../db.js';

export const vehiclesRouter = Router();

vehiclesRouter.post('/', async (req, res) => {
  try {
    const { name, zoneId } = req.body;
    if (!name || !name.trim() || !zoneId) {
      return res.status(400).json({ error: 'name and zoneId are required' });
    }

    const { data: maxData, error: maxError } = await supabase
      .from('vehicles')
      .select('position')
      .order('position', { ascending: false })
      .limit(1)
      .single();

    if (maxError && maxError.code !== 'PGRST116') throw maxError;
    const maxPosition = maxData?.position || 0;
    const nextPosition = maxPosition + 1;

    const { data, error } = await supabase
      .from('vehicles')
      .insert([{ name: name.trim(), zone_id: Number(zoneId), position: nextPosition }])
      .select('id, name, zone_id as zoneId, in_repair as inRepair, position');

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

vehiclesRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, zoneId, inRepair } = req.body;

    const { data: existing, error: fetchError } = await supabase
      .from('vehicles')
      .select('id, name, zone_id as zoneId, in_repair as inRepair')
      .eq('id', Number(id))
      .single();

    if (fetchError) throw fetchError;
    if (!existing) return res.status(404).json({ error: 'not found' });

    const nextName = name !== undefined ? name.trim() : existing.name;
    const nextZoneId = zoneId !== undefined ? Number(zoneId) : existing.zoneId;
    const nextInRepair = inRepair !== undefined ? Boolean(inRepair) : existing.inRepair;

    const { data, error } = await supabase
      .from('vehicles')
      .update({ name: nextName, zone_id: nextZoneId, in_repair: nextInRepair })
      .eq('id', Number(id))
      .select('id, name, zone_id as zoneId, in_repair as inRepair');

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

vehiclesRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('vehicles')
      .delete()
      .eq('id', Number(id));

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
