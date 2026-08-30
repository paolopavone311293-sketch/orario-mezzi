// Popola la seconda app (tabelle app2_) con targhe, codici e persone assegnate.
// Richiede la colonna app2_vehicles.code (vedi supabase-add-code-column.sql).
// Uso:  node scripts/seed-app2.mjs   (Node 18+; app2_people/vehicles devono essere VUOTE)

const URL = 'https://zltsdiaefuokeuuwdxfp.supabase.co/rest/v1';
const KEY = 'sb_publishable_TF4NSM-LZVfT-dVPeSCdPA_dK0flzt6';
const H = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
};

// [position, code, targa (''=nessuna), cognome]
const DATA = [
  [1, '1', 'XB982', 'MURA'],
  [2, '2', 'XB97XK', 'IZZO'],
  [3, '3', 'XB97XM', 'LAZZARINI'],
  [4, '4', 'XB97XP', 'TASCIONE'],
  [5, '5', 'GK645DT', 'GHERARDUCCI'],
  [6, '6', 'XB97Y7', 'VECCHI'],
  [7, '7', 'FN74549', 'SERRA'],
  [8, '8', 'EZ65646', 'MUSCILLO'],
  [9, '9', 'FA93785', 'MARINAI'],
  [10, '10', 'EZ65644', 'FANTINATO'],
  [11, '11', 'FA93790', 'FELICI'],
  [12, '12', 'FA93789', 'GAROFOLI'],
  [13, '13', 'XB97YC', 'LANDINI'],
  [14, '14', 'XB97XZ', 'CIPRIA'],
  [15, '15', 'EZ65643', 'SABATINI'],
  [16, '16', 'XB97XV', 'MENICHETTI'],
  [17, '17', 'XB97Y5', 'SERENI'],
  [18, '18', 'XB97XX', 'PIEROTTI'],
  [19, '19', 'FA93788', 'TALINI'],
  [20, '20', 'FA93792', 'CATENI'],
  [21, '21', 'EZ65649', 'ESPOSITO'],
  [22, '22', 'FA93787', 'BERTOLINI'],
  [23, '23', 'XB97XS', 'GIORGOLO'],
  [24, '24', 'EZ65652', 'PARDINI'],
  [25, '25', 'GH552MW', 'RORRO'],
  [26, '26', 'GJ613PZ', 'TACCOLA'],
  [27, '27', 'GJ654PZ', 'MONETTI'],
  [28, '28', 'GK644DT', 'GROSSI'],
  [29, '29', 'EZ65645', 'MENEO'],
  [30, '30', 'FA93786', 'LOCCI'],
  [31, '31', 'GL898GN', 'FERRI'],
  [32, '32', 'GK119TB', 'DAVIDDI'],
  [33, '33', 'GL899GN', 'PALLA'],
  [34, '34', 'GT759CZ', 'MACCHI'],
  [35, '35', 'GL897GN', 'NOVELLI'],
  [36, '36', 'FA93791', 'TAMAGNO'],
  [37, '37', 'GL896GN', 'CICCONE'],
  [38, '38', 'GT060HF', 'BARGAGNA'],
  [39, '39', 'EW56586', 'CONSANI'],
  [40, '40', 'GL895GN', 'SBRANA'],
  [41, '41', 'GT069HF', 'ARGENZIANO'],
  [42, '42', 'FD15483', 'SCERBO'],
  [43, '43', 'FD15484', 'TABUCCHI'],
  [44, 'LM44', 'HA991FS', 'DI MARCO'],
  [45, 'LM45', 'GJ531HW', 'BALESTRI'],
  [46, 'LM46', 'GS563TX', 'DI COLO'],
  [47, 'LM47', 'GG760ZD', 'NORFINI'],
  [48, 'LM48', 'GJ530HW', 'ORSINI'],
  [49, 'LM49', 'GS564TX', 'FORNI'],
  [50, 'LM50', 'GG759ZD', 'LO PRESTI'],
  [51, 'LB51', 'FA93784', 'RIZZA'],
  [52, 'LB52', 'GH553MW', 'STEFANELLI'],
  [53, 'LB53', 'GH555MW', 'ROSSITTO'],
  [54, 'LB54', 'EZ65650', 'LUPERI'],
  [55, 'LB55', 'GJ653PZ', 'BISSO'],
  [56, 'LB56', 'EZ45757', 'BASSANO'],
  [57, 'LB57', 'GH556MW', 'BELLANI'],
  [58, 'LB58', 'GH558MW', 'CILEA'],
  [59, 'LB59', 'GK646DT', 'FERRETTI'],
  [60, 'LB60', 'GH557MW', 'BIASCI'],
  [61, 'LB61', 'GH560MW', 'CECCHI'],
  [62, 'LB62', '', 'PIERONI'],
  [63, 'LB63', 'GH554MW', 'BARBERI'],
  [64, 'LB64', 'GH559MW', 'MACCHIA'],
  [65, 'LB65', '', 'RAGOSTA'],
  [66, 'LB66', 'GJ655PZ', 'FIORIMO'],
  [67, 'LB67', 'GP904VG', 'GORETTI'],
  [68, 'LB68', 'GJ656PZ', 'DI LUPO'],
  [69, 'LBC69', 'EZ45756', 'CATOLA'],
];

async function post(table, rows) {
  const r = await fetch(`${URL}/${table}`, { method: 'POST', headers: H, body: JSON.stringify(rows) });
  if (!r.ok) throw new Error(`${table}: ${r.status} ${await r.text()}`);
  return r.json();
}
async function get(table, q) {
  const r = await fetch(`${URL}/${table}?${q}`, { headers: H });
  if (!r.ok) throw new Error(`${table} GET: ${r.status} ${await r.text()}`);
  return r.json();
}

const main = async () => {
  // 1) persone
  const people = await post('app2_people', DATA.map(([, , , name]) => ({ name, active: true })));
  console.log('persone inserite:', people.length);

  // 2) mezzi (zona 1, cosmetica; il codice e' cio' che si mostra)
  const vehicles = await post('app2_vehicles', DATA.map(([position, code, targa]) => ({
    name: targa, zone_id: 1, in_repair: false, position, code,
  })));
  console.log('mezzi inseriti:', vehicles.length);

  // 3) mappe per collegare le assegnazioni
  const peopleAll = await get('app2_people', 'select=id,name');
  const vehiclesAll = await get('app2_vehicles', 'select=id,code');
  const pByName = new Map(peopleAll.map((p) => [p.name, p.id]));
  const vByCode = new Map(vehiclesAll.map((v) => [v.code, v.id]));

  // 4) assegnazioni fisse (default, data 1900-01-01) mezzo<->persona
  const assigns = DATA.map(([, code, , name]) => ({
    date: '1900-01-01', vehicle_id: vByCode.get(code), person_id: pByName.get(name),
  })).filter((a) => a.vehicle_id && a.person_id);
  const created = await post('app2_assignments', assigns);
  console.log('assegnazioni fisse create:', created.length);
};

main().then(() => console.log('FATTO')).catch((e) => { console.error('ERRORE', e.message); process.exit(1); });
