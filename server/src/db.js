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
    in_repair INTEGER NOT NULL DEFAULT 0
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
  const insertVehicle = db.prepare('INSERT INTO vehicles (name, zone_id) VALUES (?, ?)');
  insertVehicle.run('Furgone 1', zoneIds[0]);
  insertVehicle.run('Auto 1', zoneIds[1]);
  insertVehicle.run('Furgone 2', zoneIds[2]);
}
