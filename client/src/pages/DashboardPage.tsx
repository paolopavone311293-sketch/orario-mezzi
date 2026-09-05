import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { toISODate, formatFullDate, formatISOShort } from '../lib/date';
import { kmMancanti, pianiDaImpostazioni, tipoValido, trattoDiRiferimento, PIANI_PREDEFINITI } from '../lib/tagliandi';
import type { Piano, TipoMezzo } from '../lib/tagliandi';
import type { Person, Zone, Assignment, AttendanceRecord, Vehicle } from '../lib/types';
import '../styles/dashboard.css';

type CardKey = 'present' | 'absent' | 'active' | 'repair';

export function DashboardPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [defaultAssignments, setDefaultAssignments] = useState<Assignment[]>([]);
  const [vacations, setVacations] = useState<{ personId: number; dateStart: string; dateEnd: string }[]>([]);
  const [revisioni, setRevisioni] = useState<{ vehicleId: number; scadenza: string | null; km: number | null }[]>([]);
  const [tagliandi, setTagliandi] = useState<{ vehicleId: number; km: number | null; tipo: string | null }[]>([]);
  const [piani, setPiani] = useState<Record<TipoMezzo, Piano>>(PIANI_PREDEFINITI);
  const [selectedCard, setSelectedCard] = useState<CardKey | null>(null);

  const toggleCard = (k: CardKey) => setSelectedCard((cur) => (cur === k ? null : k));

  const today = toISODate(new Date());

  useEffect(() => {
    Promise.all([
      api.people.list().then(setPeople),
      api.zones.list().then(setZones),
      api.attendance.range(today, today).then(setAttendance),
      api.assignments.forDate(today).then(setAssignments),
      api.assignments.defaults().then(setDefaultAssignments),
      api.vacations.range(today, today).then(setVacations),
      api.revisioni.list().then(setRevisioni).catch(() => setRevisioni([])),
      api.tagliandi.list().then(setTagliandi).catch(() => setTagliandi([])),
      api.settings
        .all()
        .then((s) => setPiani(pianiDaImpostazioni(s)))
        .catch(() => {}),
    ]);
  }, []);

  const allVehicles = zones.flatMap((z) => z.vehicles || []);
  const totalVehicles = allVehicles.length;
  const vehiclesInRepair = allVehicles.filter((v) => v.inRepair).length;
  const activeVehicles = totalVehicles - vehiclesInRepair;

  const activeIds = new Set(people.map((p) => p.id));
  // Persone non al lavoro oggi: assenti (stato "A") oppure in ferie
  const awayIds = new Set<number>();
  attendance.forEach((a) => {
    if (a.status === 'absent' && activeIds.has(a.personId)) awayIds.add(a.personId);
  });
  vacations.forEach((v) => {
    if (v.dateStart <= today && today <= v.dateEnd && activeIds.has(v.personId)) awayIds.add(v.personId);
  });

  const totalPeople = people.length;
  const absentToday = awayIds.size;
  const presentToday = totalPeople - absentToday;

  // Mezzi (non in riparazione) coperti da un'assegnazione esplicita o da un default attivo
  const assignedVehicleIds = new Set<number>();
  assignments.forEach((a) => assignedVehicleIds.add(a.vehicleId));
  defaultAssignments.forEach((d) => {
    if (!awayIds.has(d.personId)) assignedVehicleIds.add(d.vehicleId);
  });
  const assignedActive = allVehicles.filter((v) => !v.inRepair && assignedVehicleIds.has(v.id)).length;
  const unassignedActive = activeVehicles - assignedActive;

  // Elenchi di dettaglio mostrati al click di una card
  const sortedVehicles = [...allVehicles].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const vehicleNumber = new Map(sortedVehicles.map((v, i) => [v.id, i + 1]));
  const nameOf = (id: number) => people.find((p) => p.id === id)?.name ?? 'Sconosciuto';
  const vacationIds = new Set(
    vacations.filter((v) => v.dateStart <= today && today <= v.dateEnd).map((v) => v.personId)
  );

  const presentList = people.filter((p) => !awayIds.has(p.id));
  const absentList = people
    .filter((p) => awayIds.has(p.id))
    .map((p) => ({ id: p.id, name: p.name, reason: vacationIds.has(p.id) ? 'Ferie' : 'Assente' }));

  const assignedNamesFor = (v: Vehicle) => {
    const explicit = assignments.filter((a) => a.vehicleId === v.id).map((a) => nameOf(a.personId));
    if (explicit.length) return explicit;
    const def = defaultAssignments.find((d) => d.vehicleId === v.id);
    if (def && !awayIds.has(def.personId)) return [nameOf(def.personId)];
    return [];
  };

  const activeList = sortedVehicles
    .filter((v) => !v.inRepair)
    .map((v) => ({ num: vehicleNumber.get(v.id)!, plate: v.name || 'senza targa', people: assignedNamesFor(v) }));
  const repairList = sortedVehicles
    .filter((v) => v.inRepair)
    .map((v) => ({ num: vehicleNumber.get(v.id)!, plate: v.name || 'senza targa' }));

  // Revisioni in scadenza (entro 1 mese o scadute), più vicine prima
  const vehicleByIdMap = new Map(allVehicles.map((v) => [v.id, v]));
  const revScadenza = revisioni
    .filter((r) => r.scadenza && vehicleByIdMap.has(r.vehicleId))
    .map((r) => {
      const today0 = new Date();
      today0.setHours(0, 0, 0, 0);
      const diff = Math.floor((new Date(r.scadenza as string).getTime() - today0.getTime()) / 86400000);
      return { plate: vehicleByIdMap.get(r.vehicleId)?.name || 'senza targa', scadenza: r.scadenza as string, diff };
    })
    .filter((r) => r.diff <= 30)
    .sort((a, b) => a.diff - b.diff);
  const revUrgent = revScadenza.some((r) => r.diff <= 7);

  // Tagliandi vicini al limite km (ultimi 20% o superato), meno km rimanenti prima.
  // Il conto parte dall'ultimo tagliando fatto, come nella pagina Tagliandi.
  const tagliandoByVehicle = new Map(tagliandi.map((t) => [t.vehicleId, t]));
  const tagliandiScadenza = allVehicles
    .filter((v) => v.km !== null && v.km !== undefined)
    .map((v) => {
      const t = tagliandoByVehicle.get(v.id);
      const piano = piani[tipoValido(t?.tipo)];
      return {
        plate: v.name || 'senza targa',
        left: kmMancanti(v.km as number, t?.km, piano),
        // il tratto in corso: prima del primo tagliando e' piu' corto di quelli dopo
        limite: trattoDiRiferimento(t?.km, piano),
      };
    })
    .filter((t) => t.left <= t.limite * 0.2)
    .sort((a, b) => a.left - b.left);
  const tagUrgent = tagliandiScadenza.some((t) => t.left <= t.limite * 0.05);

  const detailTitle =
    selectedCard === 'present' ? `Presenti oggi (${presentList.length})` :
    selectedCard === 'absent' ? `Assenti oggi (${absentList.length})` :
    selectedCard === 'active' ? `Mezzi attivi (${activeList.length})` :
    selectedCard === 'repair' ? `Mezzi in riparazione (${repairList.length})` : '';

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="subtitle">Panoramica della giornata di {formatFullDate(new Date())}</p>
      </div>

      <div className="stats-grid">
        <div
          className={`stat-card highlight-success clickable ${selectedCard === 'present' ? 'selected' : ''}`}
          onClick={() => toggleCard('present')}
        >
          <div className="stat-icon">✓</div>
          <div className="stat-content">
            <div className="stat-value">{presentToday}</div>
            <div className="stat-label">Presenti Oggi</div>
          </div>
        </div>

        <div
          className={`stat-card highlight-danger clickable ${selectedCard === 'absent' ? 'selected' : ''}`}
          onClick={() => toggleCard('absent')}
        >
          <div className="stat-icon">✗</div>
          <div className="stat-content">
            <div className="stat-value">{absentToday}</div>
            <div className="stat-label">Assenti Oggi</div>
          </div>
        </div>

        <div
          className={`stat-card clickable ${selectedCard === 'active' ? 'selected' : ''}`}
          onClick={() => toggleCard('active')}
        >
          <div className="stat-icon">🚗</div>
          <div className="stat-content">
            <div className="stat-value">{activeVehicles}</div>
            <div className="stat-label">Mezzi Attivi</div>
          </div>
        </div>

        <div
          className={`stat-card highlight-warning clickable ${selectedCard === 'repair' ? 'selected' : ''}`}
          onClick={() => toggleCard('repair')}
        >
          <div className="stat-icon">🔧</div>
          <div className="stat-content">
            <div className="stat-value">{vehiclesInRepair}</div>
            <div className="stat-label">Mezzi in Riparazione</div>
          </div>
        </div>
      </div>

      {selectedCard && (
        <div className="dashboard-detail">
          <div className="detail-header">
            <h3>{detailTitle}</h3>
            <button className="detail-close" onClick={() => setSelectedCard(null)} title="Chiudi">
              ✕
            </button>
          </div>

          {selectedCard === 'present' && (
            presentList.length ? (
              <div className="detail-chips">
                {presentList.map((p) => (
                  <span key={p.id} className="detail-chip">{p.name}</span>
                ))}
              </div>
            ) : <p className="detail-empty">Nessuno</p>
          )}

          {selectedCard === 'absent' && (
            absentList.length ? (
              <div className="detail-chips">
                {absentList.map((p) => (
                  <span key={p.id} className="detail-chip">
                    {p.name}
                    <span className={`chip-tag ${p.reason === 'Ferie' ? 'ferie' : 'assente'}`}>{p.reason}</span>
                  </span>
                ))}
              </div>
            ) : <p className="detail-empty">Nessuno</p>
          )}

          {selectedCard === 'active' && (
            activeList.length ? (
              <div className="detail-vehicles">
                {activeList.map((v) => (
                  <div key={v.num} className="detail-vehicle">
                    <span className="dv-num">{v.num}</span>
                    <div className="dv-info">
                      <span className="dv-plate">{v.plate}</span>
                      <span className="dv-person">
                        {v.people.length ? v.people.join(', ') : '— non assegnato'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="detail-empty">Nessuno</p>
          )}

          {selectedCard === 'repair' && (
            repairList.length ? (
              <div className="detail-vehicles">
                {repairList.map((v) => (
                  <div key={v.num} className="detail-vehicle">
                    <span className="dv-num">{v.num}</span>
                    <div className="dv-info">
                      <span className="dv-plate">In riparazione</span>
                      <span className="dv-person">{v.plate}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="detail-empty">Nessuno</p>
          )}
        </div>
      )}

      <div className="info-sections">
        <div className="info-card">
          <h3>Avvisi Rapidi</h3>
          <div className="info-content">
            {revScadenza.length > 0 && (
              <div className={`alert ${revUrgent ? 'alert-danger' : 'alert-warning'}`}>
                🔍 {revScadenza.length === 1 ? '1 revisione in scadenza' : `${revScadenza.length} revisioni in scadenza`}:{' '}
                {revScadenza.map((r) => `${r.plate} (${formatISOShort(r.scadenza)})`).join(', ')}
              </div>
            )}
            {tagliandiScadenza.length > 0 && (
              <div className={`alert ${tagUrgent ? 'alert-danger' : 'alert-warning'}`}>
                🧰 {tagliandiScadenza.length === 1 ? '1 tagliando in scadenza' : `${tagliandiScadenza.length} tagliandi in scadenza`}:{' '}
                {tagliandiScadenza
                  .map((t) => `${t.plate} (${t.left <= 0 ? 'superato' : `${t.left.toLocaleString('it-IT')} km`})`)
                  .join(', ')}
              </div>
            )}
            {absentToday > 0 && (
              <div className="alert alert-warning">
                ⚠️ {absentToday} {absentToday === 1 ? 'persona assente' : 'persone assenti'} oggi
              </div>
            )}
            {presentToday === totalPeople && (
              <div className="alert alert-success">
                ✓ Tutti presenti oggi
              </div>
            )}
            {unassignedActive > 0 && (
              <div className="alert alert-info">
                ℹ️ {unassignedActive} {unassignedActive === 1 ? 'mezzo' : 'mezzi'} non ancora assegnati
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
