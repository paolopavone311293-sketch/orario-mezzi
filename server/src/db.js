import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'data.sqlite');

export const db = new DatabaseSync(dbPath);

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS people (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'present',
    UNIQUE(person_id, date)
  );

  CREATE TABLE IF NOT EXISTS zones (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    zone_id INTEGER REFERENCES zones(id) ON DELETE CASCADE,
    in_repair INTEGER NOT NULL DEFAULT 0,
    position INTEGER UNIQUE
  );

  CREATE TABLE IF NOT EXISTS assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    UNIQUE(date, vehicle_id, person_id)
  );

  CREATE TABLE IF NOT EXISTS vacations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    person_id INTEGER NOT NULL REFERENCES people(id) ON DELETE CASCADE,
    date_start TEXT NOT NULL,
    date_end TEXT NOT NULL
  );
`);

const personCount = db.prepare('SELECT COUNT(*) AS c FROM people').get().c;
if (personCount === 0) {
  const insertPerson = db.prepare('INSERT INTO people (name) VALUES (?)');
  for (const name of ['Mario Rossi', 'Luigi Bianchi', 'Anna Verdi', 'Giulia Neri']) {
    insertPerson.run(name);
  }
}

const zoneCount = db.prepare('SELECT COUNT(*) AS c FROM zones').get().c;
if (zoneCount === 0) {
  const insertZone = db.prepare('INSERT INTO zones (name) VALUES (?)');
  const zoneIds = ['Zona Nord', 'Zona Sud', 'Zona Centro'].map((name) => {
    insertZone.run(name);
    return db.prepare('SELECT last_insert_rowid() AS id').get().id;
  });
  const insertVehicle = db.prepare('INSERT INTO vehicles (name, zone_id, position) VALUES (?, ?, ?)');
  const testPlates = [
    'EV', 'EW2', 'Ew1',
    'UV123', 'WX456', 'YZ789', 'AA111', 'BB222', 'CC333', 'DD444', 'EE555',
    'FF666', 'GG777', 'HH888', 'II999', 'JJ000', 'KK111', 'LL222', 'MM333', 'NN444',
    'OO555', 'PP666', 'QQ777', 'RR888', 'SS999', 'TT000', 'UU111', 'VV222', 'WW333', 'XX444', 'YY555',
    'ZZ666', 'AB777', 'AC888', 'AD999'
  ];
  testPlates.forEach((plate, i) => {
    insertVehicle.run(plate, zoneIds[i % 3], i + 1);
  });
}

// Assign positions to existing vehicles that don't have one
const vehiclesWithoutPosition = db.prepare('SELECT id FROM vehicles WHERE position IS NULL ORDER BY id').all();
if (vehiclesWithoutPosition.length > 0) {
  const maxPosition = db.prepare('SELECT MAX(position) AS max FROM vehicles').get().max || 0;
  const updatePosition = db.prepare('UPDATE vehicles SET position = ? WHERE id = ?');
  vehiclesWithoutPosition.forEach((v, i) => {
    updatePosition.run(maxPosition + i + 1, v.id);
  });
}
