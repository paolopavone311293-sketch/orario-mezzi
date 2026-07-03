import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize tables and seed data
async function initialize() {
  try {
    console.log('🔄 Initializing Orario Mezzi tables...');

    // Check if people table has data
    const { data: people, error: peopleError } = await supabase
      .from('people')
      .select('*', { count: 'exact' })
      .limit(1);

    if (peopleError && peopleError.code !== 'PGRST116') {
      throw peopleError;
    }

    const peopleCount = people?.length || 0;

    if (peopleCount === 0) {
      console.log('Seeding initial data for Orario Mezzi...');

      // Seed people
      const names = ['Mario Rossi', 'Luigi Bianchi', 'Anna Verdi', 'Giulia Neri'];
      const { error: insertPeopleError } = await supabase
        .from('people')
        .insert(names.map(name => ({ name, active: true })));

      if (insertPeopleError) throw insertPeopleError;

      // Seed zones
      const zoneNames = ['Zona Nord', 'Zona Sud', 'Zona Centro'];
      const { data: zones, error: insertZonesError } = await supabase
        .from('zones')
        .insert(zoneNames.map(name => ({ name })))
        .select('id');

      if (insertZonesError) throw insertZonesError;

      // Seed vehicles
      const plates = [
        'EV', 'EW2', 'Ew1',
        'UV123', 'WX456', 'YZ789', 'AA111', 'BB222', 'CC333', 'DD444', 'EE555',
        'FF666', 'GG777', 'HH888', 'II999', 'JJ000', 'KK111', 'LL222', 'MM333', 'NN444',
        'OO555', 'PP666', 'QQ777', 'RR888', 'SS999', 'TT000', 'UU111', 'VV222', 'WW333', 'XX444', 'YY555',
        'ZZ666', 'AB777', 'AC888', 'AD999'
      ];

      const vehiclesToInsert = plates.map((plate, i) => ({
        name: plate,
        zone_id: zones[i % zones.length].id,
        position: i + 1,
        in_repair: false
      }));

      const { error: insertVehiclesError } = await supabase
        .from('vehicles')
        .insert(vehiclesToInsert);

      if (insertVehiclesError) throw insertVehiclesError;

      console.log('✅ Initial data seeded successfully');
    } else {
      console.log('✅ Tables already have data, skipping seed');
    }

    console.log('✅ Database initialized');
  } catch (error) {
    console.error('❌ Error initializing database:', error.message);
    // Don't exit, the app can still run
  }
}

// Initialize on startup
initialize();
