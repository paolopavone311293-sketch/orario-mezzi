import { Router } from 'express';
import { supabase } from '../db.js';

export const zonesRouter = Router();

zonesRouter.get('/', async (req, res) => {
  try {
    const { data: zones, error: zonesError } = await supabase
      .from('zones')
      .select('id, name')
      .order('id');

    if (zonesError) throw zonesError;

    const { data: allVehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, name, zone_id as zoneId, in_repair as inRepair, position')
      .order('position');

    if (vehiclesError) throw vehiclesError;

    const vehiclesByZone = {};
    allVehicles.forEach((v) => {
      if (!vehiclesByZone[v.zoneId]) vehiclesByZone[v.zoneId] = [];
      vehiclesByZone[v.zoneId].push(v);
    });

    const result = zones.map((zone) => ({
      ...zone,
      vehicles: vehiclesByZone[zone.id] || [],
    }));
    result._allVehicles = allVehicles;
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

zonesRouter.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const { data, error } = await supabase
      .from('zones')
      .insert([{ name: name.trim() }])
      .select('id, name');

    if (error) throw error;
    res.status(201).json({ ...data[0], vehicles: [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

zonesRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const { data: existing, error: fetchError } = await supabase
      .from('zones')
      .select('id')
      .eq('id', Number(id))
      .single();

    if (fetchError) throw fetchError;
    if (!existing) return res.status(404).json({ error: 'not found' });

    const { data, error } = await supabase
      .from('zones')
      .update({ name: name.trim() })
      .eq('id', Number(id))
      .select('id, name');

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

zonesRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('zones')
      .delete()
      .eq('id', Number(id));

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
