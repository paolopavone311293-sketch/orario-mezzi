import { useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { toISODate } from '../lib/date';
import { useDialog } from '../components/DialogContext';
import { ModernSelect } from '../components/ModernSelect';
import { DatePicker } from '../components/DatePicker';
import type { Assignment, AttendanceRecord, Person, Zone } from '../lib/types';
import { EditContext } from '../App';
import '../styles/vehicles.css';

export function VehiclesPage() {
  const dialog = useDialog();
  const { editVehicles } = useContext(EditContext);
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [zones, setZones] = useState<Zone[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [defaultAssignments, setDefaultAssignments] = useState<Assignment[]>([]);
  const [vacations, setVacations] = useState<{ personId: number; dateStart: string; dateEnd: string }[]>([]);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [editingVehicleName, setEditingVehicleName] = useState('');

  const loadZones = () => api.zones.list().then((data: any) => {
    setZones(data.filter((z: any) => z.id !== undefined));
  });

  useEffect(() => {
    loadZones();
    api.people.list().then(setPeople);
    api.assignments.defaults().then(setDefaultAssignments);
  }, []);

  useEffect(() => {
    api.attendance.range(date, date).then(setAttendance);
    api.assignments.forDate(date).then(setAssignments);
    api.vacations.range(date, date).then(setVacations);
  }, [date]);

  const allVehicles = useMemo(() => {
    const vehicles: any[] = [];
    zones.forEach((z) => {
      z.vehicles?.forEach((v) => {
        vehicles.push(v);
      });
    });
    return vehicles.sort((a, b) => (a.position || 0) - (b.position || 0));
  }, [zones]);

  // Persone non disponibili: in ferie oppure segnate assenti (A) — stesse regole
  const unavailableIds = useMemo(() => {
    const ids = new Set(
      vacations
        .filter((v) => v.dateStart <= date && date <= v.dateEnd)
        .map((v) => v.personId)
    );
    attendance.forEach((a) => {
      if (a.status === 'absent') ids.add(a.personId);
    });
    return ids;
  }, [vacations, attendance, date]);

  const defaultPersonByVehicle = useMemo(() => {
    return new Map(defaultAssignments.map((a) => [a.vehicleId, a.personId]));
  }, [defaultAssignments]);

  // Persone già coperte oggi da un'assegnazione esplicita o da un default attivo (non in ferie, mezzo non in riparazione)
  const effectivelyUsedPersonIds = useMemo(() => {
    const used = new Set<number>();
    allVehicles.forEach((v) => {
      if (v.inRepair) return;
      const explicit = assignments.filter((a) => a.vehicleId === v.id);
      if (explicit.length > 0) {
        explicit.forEach((a) => used.add(a.personId));
        return;
      }
      const defaultPersonId = defaultPersonByVehicle.get(v.id);
      if (defaultPersonId && !unavailableIds.has(defaultPersonId)) {
        used.add(defaultPersonId);
      }
    });
    return used;
  }, [assignments, allVehicles, defaultPersonByVehicle, unavailableIds]);

  const presentPeople = useMemo(() => {
    const statusByPerson = new Map(attendance.map((a) => [a.personId, a.status]));
    return people.filter(
      (p) => (statusByPerson.get(p.id) ?? 'present') === 'present' && !unavailableIds.has(p.id)
    );
  }, [people, attendance, unavailableIds]);

  const getAssignedForVehicle = (vehicle: any) => {
    if (vehicle.inRepair) return [];
    const explicit = assignments.filter((a) => a.vehicleId === vehicle.id);
    if (explicit.length > 0) {
      return explicit
        .map((a) => ({ person: people.find((p) => p.id === a.personId), assignmentId: a.id, defaultId: undefined as number | undefined }))
        .filter((x) => x.person);
    }
    const defaultAssignment = defaultAssignments.find((a) => a.vehicleId === vehicle.id);
    if (defaultAssignment && !unavailableIds.has(defaultAssignment.personId)) {
      const person = people.find((p) => p.id === defaultAssignment.personId);
      if (person) return [{ person, assignmentId: undefined as number | undefined, defaultId: defaultAssignment.id }];
    }
    return [];
  };

  const assignPerson = async (vehicleId: number, personId: number) => {
    if (!personId) return;
    const created = await api.assignments.create(date, vehicleId, personId);
    setAssignments((prev) => [...prev, created]);
  };

  const unassign = async (assignmentId: number) => {
    await api.assignments.remove(assignmentId);
    setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
  };

  const removeDefault = (defaultId: number) => {
    dialog.confirm({
      title: 'Rimuovi Assegnazione Fissa',
      message: 'Il mezzo non avrà più una persona di default assegnata automaticamente ogni giorno.',
      confirmText: 'Rimuovi',
      cancelText: 'Annulla',
      isDestructive: true,
      onConfirm: async () => {
        await api.assignments.remove(defaultId);
        setDefaultAssignments((prev) => prev.filter((a) => a.id !== defaultId));
      },
    });
  };

  const updateVehicleName = async (vehicleId: number, newName: string) => {
    if (!newName.trim()) return;
    try {
      if (vehicleId < 0) {
        const firstZoneId = zones[0]?.id;
        if (firstZoneId) {
          await api.vehicles.create(newName, firstZoneId);
        }
      } else {
        await api.vehicles.update(vehicleId, { name: newName });
      }
      loadZones();
      setEditingVehicleId(null);
    } catch (err) {
      console.error('Error updating vehicle:', err);
    }
  };

  // Crea array di 34 elementi (vuoti o con dati)
  const rows = Array.from({ length: 34 }, (_, i) => {
    const vehicle = allVehicles[i];
    return {
      numero: i + 1,
      vehicle,
      assigned: vehicle ? getAssignedForVehicle(vehicle) : [],
    };
  });

  return (
    <div className="vehicles-page">
      <div className="page-header">
        <h1>Zone e Mezzi</h1>
        <p className="subtitle">Assegna le persone ai mezzi</p>
      </div>

      <div className="controls">
        <div className="date-selector">
          <DatePicker value={date} onChange={setDate} />
          <button className="secondary" onClick={() => setDate(toISODate(new Date()))}>
            Oggi
          </button>
          <button
            className="secondary"
            onClick={() => {
              const tomorrow = new Date();
              tomorrow.setDate(tomorrow.getDate() + 1);
              if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1); // domenica → lunedì
              setDate(toISODate(tomorrow));
            }}
          >
            Domani
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="vehicles-table">
          <thead>
            <tr>
              <th className="col-numero">N°</th>
              <th className="col-targa">Targa</th>
              <th className="col-nome">Nome</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const vehicle = row.vehicle;
              const isInRepair = !!vehicle?.inRepair;
              return (
                <tr key={row.numero} className={`${vehicle ? 'has-data' : 'empty'} ${isInRepair ? 'in-repair' : ''}`}>
                  <td className="col-numero">{row.numero}</td>
                  <td className="col-targa">
                    {editingVehicleId === vehicle?.id && editVehicles ? (
                      <input
                        autoFocus
                        type="text"
                        value={editingVehicleName}
                        onChange={(e) => setEditingVehicleName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateVehicleName(vehicle!.id, editingVehicleName);
                          } else if (e.key === 'Escape') {
                            setEditingVehicleId(null);
                          }
                        }}
                        onBlur={() => updateVehicleName(vehicle!.id, editingVehicleName)}
                        className="vehicle-name-input"
                      />
                    ) : editingVehicleId === -row.numero && editVehicles ? (
                      <input
                        autoFocus
                        type="text"
                        value={editingVehicleName}
                        onChange={(e) => setEditingVehicleName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            updateVehicleName(-row.numero, editingVehicleName);
                          } else if (e.key === 'Escape') {
                            setEditingVehicleId(null);
                          }
                        }}
                        onBlur={() => updateVehicleName(-row.numero, editingVehicleName)}
                        className="vehicle-name-input"
                        placeholder="Nome targa..."
                      />
                    ) : vehicle ? (
                      <span
                        onClick={() => {
                          if (editVehicles) {
                            setEditingVehicleId(vehicle.id);
                            setEditingVehicleName(vehicle.name || '');
                          }
                        }}
                        className={`editable-targa ${editVehicles ? 'editable' : 'disabled'}`}
                      >
                        {vehicle.name || '—'}
                      </span>
                    ) : (
                      <span
                        onClick={() => {
                          setEditingVehicleId(-row.numero);
                          setEditingVehicleName('');
                        }}
                        className="editable-targa editable"
                      >
                        Aggiungi targa
                      </span>
                    )}
                  </td>
                  <td className="col-nome">
                    <div className="names-list">
                      {vehicle && row.assigned.length > 0 ? (
                        row.assigned.map(({ person, assignmentId, defaultId }) => (
                          <span key={person!.id} className={`name-item ${defaultId ? 'is-default' : ''}`}>
                            {person!.name}
                            {assignmentId && (
                              <button
                                className="remove-name"
                                onClick={() => unassign(assignmentId)}
                              >
                                ✕
                              </button>
                            )}
                            {defaultId && (
                              <button
                                className="remove-name"
                                title="Rimuovi assegnazione fissa"
                                onClick={() => removeDefault(defaultId)}
                              >
                                ✕
                              </button>
                            )}
                          </span>
                        ))
                      ) : vehicle ? (
                        <ModernSelect
                          value=""
                          onChange={(value) => assignPerson(vehicle.id, Number(value))}
                          disabled={isInRepair}
                          placeholder={isInRepair ? 'Mezzo in riparazione' : 'Seleziona persona...'}
                          options={!isInRepair ? presentPeople
                            .filter((p) => !effectivelyUsedPersonIds.has(p.id))
                            .map((p) => ({ value: String(p.id), label: p.name })) : []}
                        />
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
