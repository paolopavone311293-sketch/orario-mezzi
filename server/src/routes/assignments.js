import { Router } from 'express';
import { supabase } from '../db.js';

export const assignmentsRouter = Router();

assignmentsRouter.get('/', async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ error: 'date query param is required' });
    }

    const { data, error } = await supabase
      .from('assignments')
      .select('id, vehicle_id as vehicleId, person_id as personId')
      .eq('date', date);

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

assignmentsRouter.post('/', async (req, res) => {
  try {
    const { date, vehicleId, personId } = req.body;
    if (!date || !vehicleId || !personId) {
      return res.status(400).json({ error: 'date, vehicleId and personId are required' });
    }

    const { data, error } = await supabase
      .from('assignments')
      .insert([{ date, vehicle_id: Number(vehicleId), person_id: Number(personId) }])
      .select('id, vehicle_id as vehicleId, person_id as personId');

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ error: 'already assigned' });
      }
      throw error;
    }

    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

assignmentsRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', Number(id));

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
