import { createClient } from '@supabase/supabase-js';
import type { Assignment, AttendanceRecord, AttendanceStatus, Note, Person, Vehicle, Zone } from './types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_KEY;

console.log('🔧 Supabase URL:', supabaseUrl);
console.log('🔧 Supabase Key:', supabaseKey ? '***' : 'UNDEFINED');

export const supabase = createClient(supabaseUrl, supabaseKey);

export const DEFAULT_ASSIGNMENT_DATE = '1900-01-01';

// Persona di servizio (nascosta, active=false) usata come sentinella per
// memorizzare la data di inizio riparazione dei mezzi nella tabella assignments,
// visto che non è possibile aggiungere colonne allo schema con la chiave anon.
const REPAIR_PERSON_NAME = '__RIPARAZIONE__';
let repairPersonId: number | null = null;

async function getRepairPersonId(): Promise<number> {
  if (repairPersonId !== null) return repairPersonId;
  const { data, error } = await supabase
    .from('people')
    .select('id')
    .eq('name', REPAIR_PERSON_NAME)
    .limit(1);
  if (error) throw error;
  if (data && data.length > 0) {
    repairPersonId = data[0].id;
    return repairPersonId!;
  }
  const { data: created, error: createError } = await supabase
    .from('people')
    .insert([{ name: REPAIR_PERSON_NAME, active: false }])
    .select('id');
  if (createError) throw createError;
  repairPersonId = created[0].id;
  return repairPersonId!;
}

export const api = {
  people: {
    list: async () => {
      const { data, error } = await supabase
        .from('people')
        .select('id, name, active')
        .eq('active', true)
        .order('id');
      if (error) throw error;
      return data as Person[];
    },
    create: async (name: string) => {
      const { data, error } = await supabase
        .from('people')
        .insert([{ name, active: true }])
        .select('id, name, active');
      if (error) throw error;
      return data[0] as Person;
    },
    update: async (id: number, patch: Partial<Pick<Person, 'name' | 'active'>>) => {
      const { data, error } = await supabase
        .from('people')
        .update(patch)
        .eq('id', id)
        .select('id, name, active');
      if (error) throw error;
      return data[0] as Person;
    },
    remove: async (id: number) => {
      const { error } = await supabase.from('people').delete().eq('id', id);
      if (error) throw error;
    },
  },
  attendance: {
    range: async (start: string, end: string) => {
      const { data, error } = await supabase
        .from('attendance')
        .select('id, person_id, date, status')
        .gte('date', start)
        .lte('date', end)
        .order('person_id')
        .order('date');
      if (error) throw error;
      return (data || []).map(r => ({
        id: r.id,
        personId: r.person_id,
        date: r.date,
        status: r.status,
      })) as AttendanceRecord[];
    },
    set: async (personId: number, date: string, status: AttendanceStatus) => {
      const { data, error } = await supabase
        .from('attendance')
        .upsert([{ person_id: personId, date, status }], { onConflict: 'person_id,date' })
        .select('id, person_id, date, status');
      if (error) throw error;
      const r = data[0];
      return {
        id: r.id,
        personId: r.person_id,
        date: r.date,
        status: r.status,
      } as AttendanceRecord;
    },
  },
  zones: {
    list: async () => {
      const { data: zones, error: zonesError } = await supabase
        .from('zones')
        .select('id, name')
        .order('id');
      if (zonesError) throw zonesError;

      const { data: vehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, name, zone_id, in_repair, position')
        .order('position');
      if (vehiclesError) throw vehiclesError;

      const vehiclesByZone: Record<number, any[]> = {};
      vehicles.forEach((v: any) => {
        if (!vehiclesByZone[v.zone_id]) vehiclesByZone[v.zone_id] = [];
        vehiclesByZone[v.zone_id].push({
          id: v.id,
          name: v.name,
          zoneId: v.zone_id,
          inRepair: v.in_repair,
          position: v.position,
        });
      });

      const result = zones.map((zone: any) => ({
        id: zone.id,
        name: zone.name,
        vehicles: vehiclesByZone[zone.id] || [],
      }));
      (result as any)._allVehicles = vehicles.map((v: any) => ({
        id: v.id,
        name: v.name,
        zoneId: v.zone_id,
        inRepair: v.in_repair,
        position: v.position,
      }));
      return result as Zone[];
    },
    create: async (name: string) => {
      const { data, error } = await supabase
        .from('zones')
        .insert([{ name }])
        .select('id, name');
      if (error) throw error;
      return { ...data[0], vehicles: [] } as Zone;
    },
    update: async (id: number, name: string) => {
      const { data, error } = await supabase
        .from('zones')
        .update({ name })
        .eq('id', id)
        .select('id, name');
      if (error) throw error;
      return data[0] as Zone;
    },
    remove: async (id: number) => {
      const { error } = await supabase.from('zones').delete().eq('id', id);
      if (error) throw error;
    },
  },
  vehicles: {
    create: async (name: string, zoneId: number) => {
      const { data: maxData } = await supabase
        .from('vehicles')
        .select('position')
        .order('position', { ascending: false })
        .limit(1)
        .single();
      const maxPosition = maxData?.position || 0;

      const { data, error } = await supabase
        .from('vehicles')
        .insert([{ name, zone_id: zoneId, position: maxPosition + 1 }])
        .select('id, name, zone_id, in_repair, position');
      if (error) throw error;
      const v = data[0];
      return {
        id: v.id,
        name: v.name,
        zoneId: v.zone_id,
        inRepair: v.in_repair,
        position: v.position,
      } as Vehicle;
    },
    update: async (id: number, patch: Partial<Pick<Vehicle, 'name' | 'zoneId' | 'inRepair'>>) => {
      const updateData: any = {};
      if (patch.name !== undefined) updateData.name = patch.name;
      if (patch.zoneId !== undefined) updateData.zone_id = patch.zoneId;
      if (patch.inRepair !== undefined) updateData.in_repair = patch.inRepair;

      const { data, error } = await supabase
        .from('vehicles')
        .update(updateData)
        .eq('id', id)
        .select('id, name, zone_id, in_repair, position');
      if (error) throw error;
      const v = data[0];
      return {
        id: v.id,
        name: v.name,
        zoneId: v.zone_id,
        inRepair: v.in_repair,
        position: v.position,
      } as Vehicle;
    },
    remove: async (id: number) => {
      const { error } = await supabase.from('vehicles').delete().eq('id', id);
      if (error) throw error;
    },
  },
  assignments: {
    forDate: async (date: string) => {
      const repairId = await getRepairPersonId();
      const { data, error } = await supabase
        .from('assignments')
        .select('id, vehicle_id, person_id')
        .eq('date', date)
        .neq('person_id', repairId);
      if (error) throw error;
      return (data || []).map(r => ({
        id: r.id,
        vehicleId: r.vehicle_id,
        personId: r.person_id,
      })) as Assignment[];
    },
    create: async (date: string, vehicleId: number, personId: number) => {
      const { data, error } = await supabase
        .from('assignments')
        .insert([{ date, vehicle_id: vehicleId, person_id: personId }])
        .select('id, vehicle_id, person_id');
      if (error) {
        if (error.code === '23505') throw new Error('already assigned');
        throw error;
      }
      const r = data[0];
      return {
        id: r.id,
        vehicleId: r.vehicle_id,
        personId: r.person_id,
      } as Assignment;
    },
    remove: async (id: number) => {
      const { error } = await supabase.from('assignments').delete().eq('id', id);
      if (error) throw error;
    },
    removeForPersonInRange: async (personId: number, dateStart: string, dateEnd: string) => {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('person_id', personId)
        .gte('date', dateStart)
        .lte('date', dateEnd);
      if (error) throw error;
    },
    defaults: async () => {
      const { data, error } = await supabase
        .from('assignments')
        .select('id, vehicle_id, person_id')
        .eq('date', DEFAULT_ASSIGNMENT_DATE);
      if (error) throw error;
      return (data || []).map(r => ({
        id: r.id,
        vehicleId: r.vehicle_id,
        personId: r.person_id,
      })) as Assignment[];
    },
    setDefault: async (vehicleId: number, personId: number) => {
      await supabase
        .from('assignments')
        .delete()
        .eq('date', DEFAULT_ASSIGNMENT_DATE)
        .eq('vehicle_id', vehicleId);
      const { data, error } = await supabase
        .from('assignments')
        .insert([{ date: DEFAULT_ASSIGNMENT_DATE, vehicle_id: vehicleId, person_id: personId }])
        .select('id, vehicle_id, person_id');
      if (error) throw error;
      const r = data[0];
      return {
        id: r.id,
        vehicleId: r.vehicle_id,
        personId: r.person_id,
      } as Assignment;
    },
  },
  repairs: {
    // Mappa vehicleId → data inizio riparazione (righe sentinella in assignments)
    dates: async () => {
      const repairId = await getRepairPersonId();
      const { data, error } = await supabase
        .from('assignments')
        .select('vehicle_id, date')
        .eq('person_id', repairId);
      if (error) throw error;
      const map: Record<number, string> = {};
      (data || []).forEach((r: any) => {
        map[r.vehicle_id] = r.date;
      });
      return map;
    },
    setDate: async (vehicleId: number, date: string) => {
      const repairId = await getRepairPersonId();
      await supabase
        .from('assignments')
        .delete()
        .eq('person_id', repairId)
        .eq('vehicle_id', vehicleId);
      const { error } = await supabase
        .from('assignments')
        .insert([{ date, vehicle_id: vehicleId, person_id: repairId }]);
      if (error) throw error;
    },
    clearDate: async (vehicleId: number) => {
      const repairId = await getRepairPersonId();
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('person_id', repairId)
        .eq('vehicle_id', vehicleId);
      if (error) throw error;
    },
  },
  vacations: {
    range: async (start: string, end: string) => {
      const { data, error } = await supabase
        .from('vacations')
        .select('id, person_id, date_start, date_end')
        .order('date_start');
      if (error) throw error;

      const filtered = (data || []).filter(v =>
        (v.date_start <= end && v.date_end >= start) ||
        (v.date_start >= start && v.date_start <= end) ||
        (v.date_end >= start && v.date_end <= end)
      );

      return filtered.map(v => ({
        id: v.id,
        personId: v.person_id,
        dateStart: v.date_start,
        dateEnd: v.date_end,
      })) as any[];
    },
    forPerson: async (personId: number) => {
      const { data, error } = await supabase
        .from('vacations')
        .select('id, person_id, date_start, date_end')
        .eq('person_id', personId)
        .order('date_start', { ascending: false });
      if (error) throw error;
      return (data || []).map(v => ({
        id: v.id,
        personId: v.person_id,
        dateStart: v.date_start,
        dateEnd: v.date_end,
      })) as any[];
    },
    create: async (personId: number, dateStart: string, dateEnd: string) => {
      const { data, error } = await supabase
        .from('vacations')
        .insert([{ person_id: personId, date_start: dateStart, date_end: dateEnd }])
        .select('id, person_id, date_start, date_end');
      if (error) throw error;
      const v = data[0];
      return {
        id: v.id,
        personId: v.person_id,
        dateStart: v.date_start,
        dateEnd: v.date_end,
      };
    },
    remove: async (id: number) => {
      const { error } = await supabase.from('vacations').delete().eq('id', id);
      if (error) throw error;
    },
  },
  notes: {
    list: async () => {
      const { data, error } = await supabase
        .from('notes')
        .select('id, vehicle_id, text, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(n => ({
        id: n.id,
        vehicleId: n.vehicle_id,
        text: n.text,
        createdAt: n.created_at,
      })) as Note[];
    },
    create: async (vehicleId: number, text: string) => {
      const { data, error } = await supabase
        .from('notes')
        .insert([{ vehicle_id: vehicleId, text }])
        .select('id, vehicle_id, text, created_at');
      if (error) throw error;
      const n = data[0];
      return {
        id: n.id,
        vehicleId: n.vehicle_id,
        text: n.text,
        createdAt: n.created_at,
      } as Note;
    },
    remove: async (id: number) => {
      const { error } = await supabase.from('notes').delete().eq('id', id);
      if (error) throw error;
    },
  },
};
