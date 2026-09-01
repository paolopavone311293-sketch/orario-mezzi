// Inserisce le scadenze REVISIONI dell'app principale (Santa Croce) dalle liste cartacee.
// Imposta anche tipo=motorino nei Tagliandi per i ciclomotori/tricicli della 2a lista.
// Uso: node scripts/seed-revisioni-santacroce.mjs

const URL = 'https://zltsdiaefuokeuuwdxfp.supabase.co/rest/v1';
const KEY = 'sb_publishable_TF4NSM-LZVfT-dVPeSCdPA_dK0flzt6';
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' };

// Lista 1 — FLOTTA (auto): [targa, scadenza prossima revisione]
// Dove c'era la data completa dell'ultima revisione, si usa lo stesso giorno +2 anni.
// Dove c'era solo "DA FARE MESE ANNO", si usa l'ultimo giorno del mese.
const AUTO = [
  ['GJ534HW', '2028-03-25'],
  ['GJ587PX', '2028-04-28'],
  ['GJ350EL', '2028-03-19'],
  ['GJ352EL', '2028-03-02'],
  ['GJ592HW', '2028-04-01'],
  ['GF921EY', '2028-03-26'],
  ['GF904EY', '2028-03-24'],
  ['GT877FY', '2028-03-31'],
  ['GF898EY', '2028-03-18'],
  ['GK573DT', '2028-05-15'],
  ['GK515DT', '2028-05-15'],
  ['HA471HJ', '2029-06-30'],
  ['GJ351EL', '2028-03-05'],
  ['GW029JC', '2028-10-31'],
  ['GZ875MJ', '2029-05-31'],
  ['GW191JC', '2028-10-31'],
  ['GZ015KB', '2029-04-30'],
  ['GT114HF', '2028-03-31'],
  ['GT879FY', '2028-03-31'],
];

// Lista 2 — CICLOMOTORI E TRICICLI: [targa, mese/anno -> ultimo giorno del mese]
const MOTORINI = [
  ['ES51394', '2027-11-30'],
  ['ES51430', '2027-11-30'],
  ['EW55968', '2027-04-30'],
  ['EW55994', '2027-03-31'],
  ['EW55958', '2027-03-31'],
  ['EV48844', '2027-01-31'],
  ['EW47766', '2027-03-31'],
  ['EW55965', '2027-03-31'],
  ['EV48696', '2027-01-31'],
  ['EW63419', '2027-03-31'],
  ['EW63551', '2027-03-31'],
  ['EW55955', '2027-03-31'],
  ['EV48684', '2027-02-28'],
];

const req = async (method, path, body, extraHeaders = {}) => {
  const r = await fetch(`${URL}${path}`, {
    method,
    headers: { ...H, ...extraHeaders },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${await r.text()}`);
  const txt = await r.text();
  return txt ? JSON.parse(txt) : null;
};

const main = async () => {
  const vehicles = await req('GET', '/vehicles?select=id,name');
  const idByPlate = new Map(vehicles.map((v) => [String(v.name).trim().toUpperCase(), v.id]));

  const missing = [];
  const revRows = [];
  const tagRows = [];

  for (const [plate, scadenza] of [...AUTO, ...MOTORINI]) {
    const id = idByPlate.get(plate);
    if (!id) { missing.push(plate); continue; }
    revRows.push({ vehicle_id: id, scadenza, km: null, tipo: null });
  }
  for (const [plate] of MOTORINI) {
    const id = idByPlate.get(plate);
    if (id) tagRows.push({ vehicle_id: id, scadenza: null, km: null, tipo: 'motorino' });
  }

  await req('POST', '/revisioni', revRows, { Prefer: 'resolution=merge-duplicates' });
  console.log('revisioni inserite:', revRows.length);

  await req('POST', '/tagliandi', tagRows, { Prefer: 'resolution=merge-duplicates' });
  console.log('tagliandi (tipo motorino) impostati:', tagRows.length);

  if (missing.length) console.log('TARGHE NON TROVATE:', missing.join(', '));

  const covered = new Set([...AUTO, ...MOTORINI].map(([p]) => p));
  const senza = vehicles.filter((v) => !covered.has(String(v.name).trim().toUpperCase())).map((v) => v.name);
  if (senza.length) console.log('MEZZI SENZA SCADENZA nelle liste:', senza.join(', '));
};

main().then(() => console.log('FATTO')).catch((e) => { console.error('ERRORE:', e.message); process.exit(1); });
