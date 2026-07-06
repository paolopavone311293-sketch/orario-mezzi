import { useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { addDays, DAY_NAMES, formatDayLabel, getWeekDays, startOfWeek, toISODate } from '../lib/date';
import { useDialog } from '../components/DialogContext';
import { EditContext } from '../App';
import type { AttendanceRecord, Person } from '../lib/types';
import '../styles/attendance.css';

interface Vacation {
  id: number;
  personId: number;
  dateStart: string;
  dateEnd: string;
}

export function AttendancePage() {
  const dialog = useDialog();
  const { editNames } = useContext(EditContext);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [people, setPeople] = useState<Person[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord['status']>>({});
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(false);

  const weekDays = useMemo(() => getWeekDays(weekStart).slice(0, 5), [weekStart]);
  const start = toISODate(weekDays[0]);
  const end = toISODate(weekDays[4]);

  useEffect(() => {
    api.people.list().then(setPeople);
  }, []);

  useEffect(() => {
    api.vacations.range(start, end).then(setVacations);
  }, [start, end]);

  useEffect(() => {
    setLoading(true);
    api
      .attendance
      .range(start, end)
      .then((records) => {
        const map: Record<string, AttendanceRecord['status']> = {};
        for (const r of records) {
          map[`${r.personId}_${r.date}`] = r.status;
        }
        setAttendance(map);
      })
      .finally(() => setLoading(false));
  }, [start, end]);

  const key = (personId: number, date: string) => `${personId}_${date}`;

  const isVacation = (personId: number, date: string) => {
    return vacations.some((v) =>
      v.personId === personId &&
      v.dateStart <= date &&
      date <= v.dateEnd
    );
  };

  const toggle = async (personId: number, date: string) => {
    if (isVacation(personId, date)) return;

    const current = attendance[key(personId, date)] ?? 'present';
    const next = current === 'present' ? 'absent' : 'present';
    setAttendance((prev) => ({ ...prev, [key(personId, date)]: next }));
    await api.attendance.set(personId, date, next);
    // Assente segue le stesse regole delle ferie: via le assegnazioni mezzo del giorno
    if (next === 'absent') {
      await api.assignments.removeForPersonInRange(personId, date, date);
    }
  };

  const addPerson = async () => {
    const name = newName.trim();
    if (!name) return;
    const created = await api.people.create(name);
    setPeople((prev) => [...prev, created]);
    setNewName('');
  };

  const removePerson = (id: number) => {
    dialog.confirm({
      title: 'Rimuovi Persona',
      message: 'Sei sicuro di voler rimuovere questa persona?',
      confirmText: 'Rimuovi',
      cancelText: 'Annulla',
      isDestructive: true,
      onConfirm: async () => {
        await api.people.remove(id);
        setPeople((prev) => prev.filter((p) => p.id !== id));
      },
    });
  };

  const saveName = async (id: number, newName: string) => {
    if (!newName.trim()) return;
    await api.people.update(id, { name: newName });
    setPeople((prev) => prev.map((p) => (p.id === id ? { ...p, name: newName } : p)));
    setEditingId(null);
  };

  const getDayAbbr = (dayIndex: number) => {
    return DAY_NAMES[dayIndex].slice(0, 3).toUpperCase();
  };

  return (
    <div className="attendance-page">
      <div className="page-header">
        <h1>Presenze / Assenze</h1>
        <p className="subtitle">Settimana corrente</p>
      </div>

      <div className="controls">
        <div className="week-nav">
          <button className="arrow-btn" onClick={() => setWeekStart((w) => addDays(w, -7))}>
            ‹
          </button>
          <div className="week-label">
            <strong>{formatDayLabel(weekDays[0])} - {formatDayLabel(weekDays[4])}</strong>
          </div>
          <button className="arrow-btn" onClick={() => setWeekStart((w) => addDays(w, 7))}>
            ›
          </button>
        </div>

        <div className="add-person">
          <input
            placeholder="Nome nuova persona"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addPerson()}
          />
          <button className="primary" onClick={addPerson}>
            Aggiungi
          </button>
        </div>
      </div>

      <div className="attendance-table-container">
        <table className="attendance-table">
          <thead>
            <tr>
              <th className="number-header">#</th>
              <th>Persona</th>
              {weekDays.map((d, i) => (
                <th key={i} className="day-header">
                  <div className="day-name">{getDayAbbr(i)}</div>
                  <div className="day-date">{formatDayLabel(d)}</div>
                </th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {people.map((person, index) => (
              <tr key={person.id}>
                <td className="number-cell">{index + 1}</td>
                <td className="person-cell">
                  {editingId === person.id && editNames ? (
                    <input
                      autoFocus
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          saveName(person.id, editingName);
                        } else if (e.key === 'Escape') {
                          setEditingId(null);
                        }
                      }}
                      onBlur={() => saveName(person.id, editingName)}
                      style={{
                        padding: '4px 8px',
                        border: '1px solid var(--color-primary)',
                        borderRadius: '4px',
                        fontSize: '14px',
                        fontFamily: 'inherit',
                      }}
                    />
                  ) : (
                    <span
                      onClick={() => {
                        if (editNames) {
                          setEditingId(person.id);
                          setEditingName(person.name);
                        }
                      }}
                      style={editNames ? { cursor: 'pointer', textDecoration: 'underline' } : {}}
                    >
                      {person.name}
                    </span>
                  )}
                </td>
                {weekDays.map((d) => {
                  const date = toISODate(d);
                  const hasVacation = isVacation(person.id, date);
                  const status = hasVacation ? 'absent' : (attendance[key(person.id, date)] ?? 'present');
                  return (
                    <td key={date} className="status-cell">
                      <button
                        className={`status-btn status-${status}`}
                        disabled={loading || hasVacation}
                        onClick={() => toggle(person.id, date)}
                        title={hasVacation ? 'In ferie' : (status === 'present' ? 'Presente' : 'Assente')}
                      >
                        {status === 'present' ? 'P' : 'A'}
                      </button>
                    </td>
                  );
                })}
                <td className="action-cell">
                  <button className="danger" onClick={() => removePerson(person.id)}>
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="legend">
        <div className="legend-item">
          <span className="legend-badge badge-present">P</span>
          <span>Presente</span>
        </div>
        <div className="legend-item">
          <span className="legend-badge badge-absent">A</span>
          <span>Assente</span>
        </div>
      </div>
    </div>
  );
}
