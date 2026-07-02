import { useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { toISODate } from '../lib/date';
import type { Assignment, AttendanceRecord, Person, Zone } from '../lib/types';
import { EditContext } from '../App';
import '../styles/vehicles.css';

export function VehiclesPage() {
  const { editVehicles } = useContext(EditContext);
  const [date, setDate] = useState(() => toISODate(new Date()));
  const [zones, setZones] = useState<Zone[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [editingVehicleId, setEditingVehicleId] = useState<number | null>(null);
  const [editingVehicleName, setEditingVehicleName] = useState('');

  const loadZones = () => api.zones.list().then((data: any) => {
    setZones(data.filter((z: any) => z.id !== undefined));
  });

  useEffect(() => {
    loadZones();
    api.people.list().then(setPeople);
  }, []);

  useEffect(() => {
    api.attendance.range(date, date).then(setAttendance);
    api.assignments.forDate(date).then(setAssignments);
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

  const presentPeople = useMemo(() => {
    const statusByPerson = new Map(attendance.map((a) => [a.personId, a.status]));
    return people.filter((p) => (statusByPerson.get(p.id) ?? 'present') === 'present');
  }, [people, attendance]);

  const getAssignedForVehicle = (vehicleId: number) => {
    return assignments
      .filter((a) => a.vehicleId === vehicleId)
      .map((a) => people.find((p) => p.id === a.personId))
      .filter(Boolean);
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
      assigned: vehicle ? getAssignedForVehicle(vehicle.id) : [],
      assignments: vehicle ? assignments.filter((a) => a.vehicleId === vehicle.id) : [],
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
          <label>
            <strong>Giorno:</strong>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </label>
          <button className="secondary" onClick={() => setDate(toISODate(new Date()))}>
            Oggi
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="vehicles-table">
          <thead>
            <tr>
              <th className="col-numero">Numero</th>
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
                        row.assigned.map((p) => {
                          const assignmentId = row.assignments.find((a) => a.personId === p!.id)?.id;
                          return (
                            <span key={p!.id} className="name-item">
                              {p!.name}
                              {assignmentId && (
                                <button
                                  className="remove-name"
                                  onClick={() => unassign(assignmentId)}
                                >
                                  ✕
                                </button>
                              )}
                            </span>
                          );
                        })
                      ) : vehicle ? (
                        <select
                          className="assign-select"
                          value=""
                          onChange={(e) => assignPerson(vehicle.id, Number(e.target.value))}
                          disabled={isInRepair}
                        >
                          <option value="">
                            {isInRepair ? 'Mezzo in riparazione' : 'Seleziona persona...'}
                          </option>
                          {!isInRepair && presentPeople
                            .filter((p) => !assignments.some((a) => a.personId === p.id))
                            .map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                        </select>
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
