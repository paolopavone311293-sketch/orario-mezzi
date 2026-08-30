import { useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import ExcelJS, { type BorderStyle } from 'exceljs';
import { EditContext } from '../App';
import { ModernSelect } from '../components/ModernSelect';
import { useDialog } from '../components/DialogContext';
import type { Assignment, Person, Vehicle } from '../lib/types';
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

  useEffect(() => {
    api.people.list().then(setPeople);
    api.zones.list().then((zones) => {
      const all = zones.flatMap((z) => z.vehicles || []);
      all.sort((a, b) => (a.position || 0) - (b.position || 0));
      setVehicles(all);
    });
    api.assignments.defaults().then(setDefaults);
  }, []);

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
