import { Router } from 'express';
import { supabase } from '../db.js';

export const vacationsRouter = Router();

vacationsRouter.get('/', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: 'start and end query params are required' });
    }

    const { data, error } = await supabase
      .from('vacations')
      .select('id, person_id, date_start, date_end')
      .order('date_start');

    if (error) throw error;

    // Filter vacations that overlap with the date range
    const filtered = (data || []).filter(v =>
      (v.date_start <= end && v.date_end >= start) ||
      (v.date_start >= start && v.date_start <= end) ||
      (v.date_end >= start && v.date_end <= end)
    );

    // Map column names
    const mapped = filtered.map(v => ({
      id: v.id,
      personId: v.person_id,
      dateStart: v.date_start,
      dateEnd: v.date_end
    }));

    res.json(mapped);
  } catch (error) {
    console.error('❌ Vacations GET error:', error);
    res.status(500).json({ error: error.message });
  }
});

vacationsRouter.get('/person/:personId', async (req, res) => {
  try {
    const { personId } = req.params;

    const { data, error } = await supabase
      .from('vacations')
      .select('id, person_id, date_start, date_end')
      .eq('person_id', Number(personId))
      .order('date_start', { ascending: false });

    if (error) throw error;

    // Map column names
    const mapped = (data || []).map(v => ({
      id: v.id,
      personId: v.person_id,
      dateStart: v.date_start,
      dateEnd: v.date_end
    }));

    res.json(mapped);
  } catch (error) {
    console.error('❌ Vacations GET /person error:', error);
    res.status(500).json({ error: error.message });
  }
});

vacationsRouter.post('/', async (req, res) => {
  try {
    const { personId, dateStart, dateEnd } = req.body;
    if (!personId || !dateStart || !dateEnd) {
      return res.status(400).json({ error: 'personId, dateStart, and dateEnd are required' });
    }

    const { data, error } = await supabase
      .from('vacations')
      .insert([{ person_id: Number(personId), date_start: dateStart, date_end: dateEnd }])
      .select('id, person_id, date_start, date_end');

    if (error) throw error;

    const v = data[0];
    res.status(201).json({
      id: v.id,
      personId: v.person_id,
      dateStart: v.date_start,
      dateEnd: v.date_end
    });
  } catch (error) {
    console.error('❌ Vacations POST error:', error);
    res.status(500).json({ error: error.message });
  }
});

vacationsRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('vacations')
      .delete()
      .eq('id', Number(id));

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    console.error('❌ Vacations DELETE error:', error);
    res.status(500).json({ error: error.message });
  }
});
