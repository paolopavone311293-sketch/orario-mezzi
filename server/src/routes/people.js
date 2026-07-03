import { Router } from 'express';
import { supabase } from '../db.js';

export const peopleRouter = Router();

peopleRouter.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('people')
      .select('id, name, active')
      .order('id');

    if (error) throw error;
    res.json(data || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

peopleRouter.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'name is required' });
    }

    const { data, error } = await supabase
      .from('people')
      .insert([{ name: name.trim(), active: true }])
      .select('id, name, active');

    if (error) throw error;
    res.status(201).json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

peopleRouter.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, active } = req.body;

    const { data: existing, error: fetchError } = await supabase
      .from('people')
      .select('id, name, active')
      .eq('id', Number(id))
      .single();

    if (fetchError) throw fetchError;
    if (!existing) return res.status(404).json({ error: 'not found' });

    const nextName = name !== undefined ? name.trim() : existing.name;
    const nextActive = active !== undefined ? active : existing.active;

    const { data, error } = await supabase
      .from('people')
      .update({ name: nextName, active: nextActive })
      .eq('id', Number(id))
      .select('id, name, active');

    if (error) throw error;
    res.json(data[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

peopleRouter.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase
      .from('people')
      .delete()
      .eq('id', Number(id));

    if (error) throw error;
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
