import { useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import ExcelJS, { type BorderStyle } from 'exceljs';
import { EditContext } from '../App';
import { ModernSelect } from '../components/ModernSelect';
import { useDialog } from '../components/DialogContext';
import {
  CHIAVE_TIPI,
  CHIAVE_TIPI_TOLTI,
  PIANO_NUOVO,
  TIPI_BASE,
  chiaviDi,
  codiceDaNome,
  tipiAggiunti,
  tipiTolti,
  tipoPredefinitoFra,
} from '../lib/tagliandi';
import type { Tipo } from '../lib/tagliandi';
import type { Assignment, Person, Vehicle } from '../lib/types';

/** Le icone fra cui scegliere per un tipo di mezzo nuovo. */
const ICONE = ['🛵', '🚗', '🏍️', '🛺', '🚙', '🚚', '🚛'];
import '../styles/settings.css';

export function SettingsPage() {
  const { editVehicles, setEditVehicles, editNames, setEditNames, darkMode, setDarkMode } = useContext(EditContext);
  const dialog = useDialog();

  // Assegnazioni fisse (default): mezzo → persona ogni giorno
  const [people, setPeople] = useState<Person[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [defaults, setDefaults] = useState<Assignment[]>([]);
  const [selPerson, setSelPerson] = useState<number | ''>('');
  const [selVehicle, setSelVehicle] = useState<number | ''>('');

  // Tipi di mezzo aggiunti a mano (quelli di sempre non si toccano)
  const [tipiExtra, setTipiExtra] = useState<Tipo[]>([]);
  const [tolti, setTolti] = useState<string[]>([]);
  const [tipiInUso, setTipiInUso] = useState<Set<string>>(new Set());
  const [mezziConTipo, setMezziConTipo] = useState(0);
  const [nuovoNome, setNuovoNome] = useState('');
  const [nuovaIcona, setNuovaIcona] = useState(ICONE[0]);
  const [nuovoPrimo, setNuovoPrimo] = useState(String(PIANO_NUOVO.primo));
  const [nuovoOgni, setNuovoOgni] = useState(String(PIANO_NUOVO.ogni));

  useEffect(() => {
    api.people.list().then(setPeople);
    api.zones.list().then((zones) => {
      const all = zones.flatMap((z) => z.vehicles || []);
      all.sort((a, b) => (a.position || 0) - (b.position || 0));
      setVehicles(all);
    });
    api.assignments.defaults().then(setDefaults);
    api.settings
      .all()
      .then((impostazioni) => {
        setTipiExtra(tipiAggiunti(impostazioni));
        setTolti(tipiTolti(impostazioni));
      })
      .catch(() => {});
    // serve a non far togliere un tipo che qualche mezzo sta usando
    api.tagliandi
      .list()
      .then((righe) => {
        setTipiInUso(new Set(righe.map((r) => r.tipo).filter(Boolean) as string[]));
        setMezziConTipo(righe.filter((r) => r.tipo).length);
      })
      .catch(() => {});
  }, []);

  /**
   * Un tipo nuovo: il nome lo scrive lui, il codice lo ricavo io perche' e'
   * quello che finisce nel database e non deve avere spazi o accenti.
   * L'elenco sta tutto in una chiave sola delle impostazioni.
   */
  const aggiungiTipo = async () => {
    const nome = nuovoNome.trim();
    if (!nome) return;

    const valore = codiceDaNome(nome);
    if (!valore) {
      dialog.alert('Nome non valido', 'Scrivi un nome con almeno una lettera o un numero.');
      return;
    }
    if ([...TIPI_BASE, ...tipiExtra].some((t) => t.valore === valore)) {
      dialog.alert('Tipo già presente', 'Un tipo di mezzo che si chiama così c\'è già.');
      return;
    }

    const primo = Number(nuovoPrimo) || PIANO_NUOVO.primo;
    const ogni = Number(nuovoOgni) || PIANO_NUOVO.ogni;
    const elenco = [...tipiExtra, { valore, etichetta: nome, icona: nuovaIcona }];

    try {
      await api.settings.set(CHIAVE_TIPI, JSON.stringify(elenco));
      await api.settings.set(chiaviDi(valore).primo, String(primo));
      await api.settings.set(chiaviDi(valore).ogni, String(ogni));
      setTipiExtra(elenco);
      setNuovoNome('');
      setNuovoPrimo(String(PIANO_NUOVO.primo));
      setNuovoOgni(String(PIANO_NUOVO.ogni));
    } catch (err) {
      console.error('Errore salvataggio tipo:', err);
      dialog.alert('Errore', 'Non sono riuscito a salvare il tipo di mezzo.');
    }
  };

  /**
   * I mezzi che non hanno mai avuto un tipo scritto: a schermo si vedono come
   * il tipo predefinito, ma nella tabella dei tagliandi non c'e' nessuna riga
   * che lo dica. Contano come «in uso» per quel tipo, altrimenti togliendolo
   * finirebbero zitti zitti dentro un altro.
   */
  const tipiVisibili = [...TIPI_BASE.filter((t) => !tolti.includes(t.valore)), ...tipiExtra];
  const mezziSenzaTipo = Math.max(0, vehicles.length - mezziConTipo);
  const predefinito = tipoPredefinitoFra(tipiVisibili);

  const tipoOccupato = (valore: string) =>
    tipiInUso.has(valore) || (mezziSenzaTipo > 0 && valore === predefinito);

  /** Rimette un tipo di sempre che era stato tolto. */
  const rimettiTipo = async (valore: string) => {
    const elenco = tolti.filter((x) => x !== valore);
    try {
      await api.settings.set(CHIAVE_TIPI_TOLTI, JSON.stringify(elenco));
      setTolti(elenco);
    } catch (err) {
      console.error('Errore ripristino tipo:', err);
    }
  };

  const rimuoviTipo = (t: Tipo) => {
    if (tipoOccupato(t.valore)) {
      const perche = tipiInUso.has(t.valore)
        ? 'Ci sono dei mezzi segnati come «' + t.etichetta + '».'
        : 'Ci sono ' + mezziSenzaTipo + ' mezzi a cui non hai mai scelto un tipo: l\'app li tratta come «' + t.etichetta + '».';
      dialog.alert(
        'Tipo in uso',
        perche + ' Cambia prima il loro tipo nella pagina Tagliandi (con Modifica Targhe acceso), poi potrai toglierlo.'
      );
      return;
    }
    if (tipiVisibili.length <= 1) {
      dialog.alert('Serve almeno un tipo', 'Non posso togliere l\'ultimo tipo di mezzo rimasto.');
      return;
    }
    dialog.confirm({
      title: 'Togliere il tipo?',
      message: '«' + t.etichetta + '» sparisce dalla tendina dei mezzi e dalla pagina KM tagliandi.',
      confirmText: 'Togli',
      isDestructive: true,
      onConfirm: async () => {
        const eDiSempre = TIPI_BASE.some((x) => x.valore === t.valore);
        try {
          if (eDiSempre) {
            const elenco = [...tolti, t.valore];
            await api.settings.set(CHIAVE_TIPI_TOLTI, JSON.stringify(elenco));
            setTolti(elenco);
          } else {
            const elenco = tipiExtra.filter((x) => x.valore !== t.valore);
            await api.settings.set(CHIAVE_TIPI, JSON.stringify(elenco));
            setTipiExtra(elenco);
          }
        } catch (err) {
          console.error('Errore rimozione tipo:', err);
        }
      },
    });
  };

  // Numero mostrato in "Zone e Mezzi" = posizione (1-based) nell'elenco ordinato
  const vehicleNumber = useMemo(() => {
    const m = new Map<number, number>();
    vehicles.forEach((v, i) => m.set(v.id, i + 1));
    return m;
  }, [vehicles]);
  const personById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const vehicleById = useMemo(() => new Map(vehicles.map((v) => [v.id, v])), [vehicles]);
  const usedPersonIds = useMemo(() => new Set(defaults.map((d) => d.personId)), [defaults]);
  const usedVehicleIds = useMemo(() => new Set(defaults.map((d) => d.vehicleId)), [defaults]);

  const vehicleLabel = (v: Vehicle) => `N° ${vehicleNumber.get(v.id)} · ${v.name || 'senza targa'}`;

  const assignFixed = async () => {
    if (!selPerson || !selVehicle) return;
    const created = await api.assignments.setDefault(Number(selVehicle), Number(selPerson));
    setDefaults((prev) => [...prev, created]);
    setSelPerson('');
    setSelVehicle('');
  };

  const removeFixed = (d: Assignment) => {
    const person = personById.get(d.personId);
    dialog.confirm({
      title: 'Rimuovi Assegnazione Fissa',
      message: `${person?.name ?? 'La persona'} non avrà più un mezzo assegnato automaticamente ogni giorno.`,
      confirmText: 'Rimuovi',
      cancelText: 'Annulla',
      isDestructive: true,
      onConfirm: async () => {
        await api.assignments.remove(d.id);
        setDefaults((prev) => prev.filter((x) => x.id !== d.id));
      },
    });
  };

  // Export to Excel
  const exportToExcel = async () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    // Load data for today
    const [zonesData, peopleData, assignmentsData] = await Promise.all([
      api.zones.list(),
      api.people.list(),
      api.assignments.forDate(todayStr),
    ]);

    // Format date
    const dayNames = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
    const monthNames = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    const dateStr = `${dayNames[today.getDay()]}, ${today.getDate()} ${monthNames[today.getMonth()]} ${today.getFullYear()}`;

    // Create workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Orario');

    // Set column widths (without auto header)
    worksheet.columns = [
      { width: 12 },
      { width: 20 },
      { width: 40 },
    ];

    // Add date row
    const dateRow = worksheet.addRow([dateStr]);
    dateRow.font = { bold: true };

    // Add empty row
    worksheet.addRow([]);

    // Add header row
    const headerRow = worksheet.addRow(['Numero', 'Targa', 'Nome']);
    headerRow.font = { bold: true };

    // Get all vehicles (up to 34)
    const allVehicles = zonesData.flatMap((z) => z.vehicles || []);

    // Add data rows
    for (let i = 0; i < 34; i++) {
      const vehicle = allVehicles[i];
      const assignedPeople = assignmentsData
        .filter((a) => a.vehicleId === vehicle?.id)
        .map((a) => peopleData.find((p) => p.id === a.personId)?.name)
        .filter(Boolean)
        .join(', ');

      worksheet.addRow([i + 1, vehicle?.name || '', assignedPeople]);
    }

    // Define border style
    const border: { top: { style: BorderStyle }; bottom: { style: BorderStyle }; left: { style: BorderStyle }; right: { style: BorderStyle } } = {
      top: { style: 'thin' as BorderStyle },
      bottom: { style: 'thin' as BorderStyle },
      left: { style: 'thin' as BorderStyle },
      right: { style: 'thin' as BorderStyle },
    };

    // Apply borders to all rows
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = border;
      });
    });

    // Generate file
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Orario-Mezzi_${todayStr}.xlsx`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>Impostazioni</h1>
        <p className="subtitle">Preferenze e export dati</p>
      </div>

      <div className="settings-container">

        {/* Theme */}
        <section className="settings-section">
          <h2>🎨 Tema</h2>
          <div className="theme-toggle">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
            <span className="toggle-text">
              {darkMode ? '🌙 Modalità scura' : '☀️ Modalità chiara'}
            </span>
          </div>
        </section>

        {/* Modifica Targhe */}
        <section className="settings-section">
          <h2>🚗 Mezzi</h2>
          <p className="section-description">
            Attiva la modifica per rinominare le targhe nella pagina Zone e Mezzi
          </p>
          <div className="theme-toggle">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={editVehicles}
                onChange={(e) => setEditVehicles(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
            <span className="toggle-text">
              {editVehicles ? '✏️ Modifica Targhe attiva' : 'Modifica Targhe'}
            </span>
          </div>
        </section>

        {/* Modifica Nomi */}
        <section className="settings-section">
          <h2>👥 Persone</h2>
          <p className="section-description">
            Attiva la modifica per rinominare le persone nella pagina Presenze
          </p>
          <div className="theme-toggle">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={editNames}
                onChange={(e) => setEditNames(e.target.checked)}
              />
              <span className="slider"></span>
            </label>
            <span className="toggle-text">
              {editNames ? '✏️ Modifica Nomi attiva' : 'Modifica Nomi'}
            </span>
          </div>
        </section>

        {/* Mezzo Fisso (assegnazioni default) */}
        <section className="settings-section">
          <h2>🚐 Mezzo Fisso</h2>
          <p className="section-description">
            Assegna un mezzo fisso a una persona: lo avrà automaticamente ogni giorno,
            salvo quando è in ferie/assente o il mezzo è in riparazione.
          </p>
          <div className="fixed-assign-form">
            <ModernSelect
              value={selPerson}
              onChange={(v) => setSelPerson(Number(v))}
              placeholder="Seleziona persona..."
              options={people
                .filter((p) => !usedPersonIds.has(p.id))
                .map((p) => ({ value: p.id, label: p.name }))}
            />
            <ModernSelect
              value={selVehicle}
              onChange={(v) => setSelVehicle(Number(v))}
              placeholder="Seleziona mezzo..."
              options={vehicles
                .filter((v) => !usedVehicleIds.has(v.id))
                .map((v) => ({ value: v.id, label: vehicleLabel(v) }))}
            />
            <button className="primary" onClick={assignFixed} disabled={!selPerson || !selVehicle}>
              Assegna
            </button>
          </div>

          {defaults.length > 0 ? (
            <div className="fixed-list">
              {defaults
                .slice()
                .sort((a, b) => (vehicleNumber.get(a.vehicleId) ?? 0) - (vehicleNumber.get(b.vehicleId) ?? 0))
                .map((d) => {
                  const v = vehicleById.get(d.vehicleId);
                  const p = personById.get(d.personId);
                  return (
                    <div key={d.id} className="fixed-item">
                      <span className="fixed-num">{vehicleNumber.get(d.vehicleId) ?? '?'}</span>
                      <div className="fixed-info">
                        <span className="fixed-plate">{v?.name || 'senza targa'}</span>
                        <span className="fixed-person" title={p?.name ?? 'Sconosciuto'}>
                          {p?.name ?? 'Sconosciuto'}
                        </span>
                      </div>
                      <button
                        className="fixed-remove"
                        title="Rimuovi assegnazione fissa"
                        onClick={() => removeFixed(d)}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="empty-message">Nessun mezzo fisso assegnato</p>
          )}
        </section>

        <section className="settings-section">
          <h2>🧰 Tipi di mezzo</h2>
          <p className="section-description">
            Ogni tipo ha i suoi km fra un tagliando e l'altro. Quello che aggiungi qui
            compare nella tendina di «Zone e Mezzi» quando inserisci un mezzo, e nella
            pagina «KM tagliandi», dove puoi cambiargli i numeri.
          </p>

          <div className="tipo-nuovo-form">
            <input
              placeholder="Nome del tipo (es. Ape Piaggio)"
              value={nuovoNome}
              onChange={(e) => setNuovoNome(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && aggiungiTipo()}
            />
            <div className="tipo-icone">
              {ICONE.map((i) => (
                <button
                  key={i}
                  type="button"
                  className={`tipo-icona ${nuovaIcona === i ? 'scelta' : ''}`}
                  onClick={() => setNuovaIcona(i)}
                  title="Icona del tipo"
                >
                  {i}
                </button>
              ))}
            </div>
            <div className="tipo-km">
              <label>
                Primo tagliando (km)
                <input
                  type="number"
                  value={nuovoPrimo}
                  onChange={(e) => setNuovoPrimo(e.target.value)}
                />
              </label>
              <label>
                Poi ogni (km)
                <input
                  type="number"
                  value={nuovoOgni}
                  onChange={(e) => setNuovoOgni(e.target.value)}
                />
              </label>
            </div>
            <button className="primary" onClick={aggiungiTipo} disabled={!nuovoNome.trim()}>
              Aggiungi tipo
            </button>
          </div>

          <div className="fixed-list">
            {tipiVisibili.map((t) => {
              const occupato = tipoOccupato(t.valore);
              return (
                <div key={t.valore} className="fixed-item">
                  <span className="fixed-num">{t.icona}</span>
                  <div className="fixed-info">
                    <span className="fixed-plate">{t.etichetta}</span>
                    <span className="fixed-person">
                      {occupato
                        ? 'in uso su dei mezzi'
                        : TIPI_BASE.some((x) => x.valore === t.valore)
                          ? 'nessun mezzo lo usa'
                          : 'aggiunto da te'}
                    </span>
                  </div>
                  <button
                    className="fixed-remove"
                    title={occupato ? 'Ci sono mezzi che lo usano' : 'Togli questo tipo'}
                    onClick={() => rimuoviTipo(t)}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>

          {tolti.length > 0 && (
            <>
              <p className="section-description">Tipi tolti, si possono rimettere:</p>
              <div className="fixed-list">
                {TIPI_BASE.filter((t) => tolti.includes(t.valore)).map((t) => (
                  <div key={t.valore} className="fixed-item tipo-tolto">
                    <span className="fixed-num">{t.icona}</span>
                    <div className="fixed-info">
                      <span className="fixed-plate">{t.etichetta}</span>
                      <span className="fixed-person">tolto</span>
                    </div>
                    <button
                      className="secondary tipo-rimetti"
                      onClick={() => rimettiTipo(t.valore)}
                    >
                      Rimetti
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>

        {/* Export Data */}
        <section className="settings-section">
          <h2>📊 Esporta Dati</h2>
          <p className="section-description">
            Scarica tutti i dati (persone, zone, mezzi) in formato Excel A4
          </p>
          <button onClick={exportToExcel} className="primary" style={{ width: '100%' }}>
            📥 Esporta in Excel
          </button>
        </section>
      </div>
    </div>
  );
}
