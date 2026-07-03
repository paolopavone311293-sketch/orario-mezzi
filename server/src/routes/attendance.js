import { Router } from 'express';
import { supabase } from '../db.js';

export const attendanceRouter = Router();

attendanceRouter.get('/', async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: 'start and end query params are required' });
    }

    const { data, error } = await supabase
      .from('attendance')
      .select('id, person_id, date, status')
      .gte('date', start)
      .lte('date', end)
      .order('person_id')
      .order('date');

    if (error) throw error;

    // Map column names
    const mapped = (data || []).map(r => ({
      id: r.id,
      personId: r.person_id,
      date: r.date,
      status: r.status
    }));

    res.json(mapped);
  } catch (error) {
    console.error('❌ Attendance GET error:', error);
    res.status(500).json({ error: error.message });
  }
});

attendanceRouter.put('/', async (req, res) => {
  try {
    const { personId, date, status } = req.body;
    if (!personId || !date || !status) {
      return res.status(400).json({ error: 'personId, date and status are required' });
    }
    if (!['present', 'absent'].includes(status)) {
      return res.status(400).json({ error: 'status must be present or absent' });
    }

    const { data, error } = await supabase
      .from('attendance')
      .upsert([{ person_id: Number(personId), date, status }], {
        onConflict: 'person_id,date'
      })
      .select('id, person_id, date, status');

    if (error) throw error;

    const row = data[0];
    res.json({
      id: row.id,
      personId: row.person_id,
      date: row.date,
      status: row.status
    });
  } catch (error) {
    console.error('❌ Attendance PUT error:', error);
    res.status(500).json({ error: error.message });
  }
});
