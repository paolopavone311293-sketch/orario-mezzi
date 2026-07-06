import { useEffect, useState, useMemo } from 'react';
import { api } from '../lib/api';
import { DAY_NAMES, formatDayLabel, getWeekDays, startOfWeek, toISODate, addDays } from '../lib/date';
import { useDialog } from '../components/DialogContext';
import { ModernSelect } from '../components/ModernSelect';
import { DatePicker } from '../components/DatePicker';
import type { Person } from '../lib/types';
import '../styles/vacations.css';

interface Vacation {
  id: number;
  personId: number;
  dateStart: string;
  dateEnd: string;
}

export function VacationsPage() {
  const dialog = useDialog();
  const [people, setPeople] = useState<Person[]>([]);
  const [vacations, setVacations] = useState<Vacation[]>([]);
  const [weekVacations, setWeekVacations] = useState<Vacation[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<number | null>(null);
  const [dateStart, setDateStart] = useState('');
  const [dateEnd, setDateEnd] = useState('');
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const weekDays = useMemo(() => getWeekDays(weekStart).slice(0, 5), [weekStart]);
  const start = toISODate(weekDays[0]);
  const end = toISODate(weekDays[4]);

  const goToPreviousWeek = () => setWeekStart((prev) => addDays(prev, -7));
  const goToToday = () => setWeekStart(startOfWeek(new Date()));
  const goToNextWeek = () => setWeekStart((prev) => addDays(prev, 7));

  useEffect(() => {
    api.people.list().then(setPeople);
  }, []);

  useEffect(() => {
    if (!selectedPerson) {
      setVacations([]);
      return;
    }
    api.vacations.forPerson(selectedPerson).then(setVacations);
  }, [selectedPerson]);

  useEffect(() => {
    api.vacations.range(start, end).then(setWeekVacations);
  }, [start, end]);

  const addVacation = async () => {
    if (!selectedPerson || !dateStart || !dateEnd) {
      dialog.alert('Errore', 'Seleziona persona, data inizio e data fine');
      return;
    }
    if (dateEnd < dateStart) {
      dialog.alert('Errore', 'La data fine deve essere successiva a quella di inizio');
      return;
    }
    const created = await api.vacations.create(selectedPerson, dateStart, dateEnd);
    await api.assignments.removeForPersonInRange(selectedPerson, dateStart, dateEnd);
    setVacations((prev) => [...prev, created]);
    setWeekVacations((prev) => [...prev, created]);
    setDateStart('');
    setDateEnd('');
  };

  const removeVacation = (id: number) => {
    dialog.confirm({
      title: 'Rimuovi Ferie',
      message: 'Sei sicuro di voler rimuovere questo periodo di ferie?',
      confirmText: 'Rimuovi',
      cancelText: 'Annulla',
      isDestructive: true,
      onConfirm: async () => {
        await api.vacations.remove(id);
        setVacations((prev) => prev.filter((v) => v.id !== id));
        setWeekVacations((prev) => prev.filter((v) => v.id !== id));
      },
    });
  };

  const getDaysCount = (start: string, end: string) => {
    const s = new Date(start);
    const e = new Date(end);
    return Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  };

  const isVacation = (personId: number, date: string) => {
    return weekVacations.some((v) =>
      v.personId === personId &&
      v.dateStart <= date &&
      date <= v.dateEnd
    );
  };

  const getDayAbbr = (dayIndex: number) => {
    return DAY_NAMES[dayIndex].slice(0, 3).toUpperCase();
  };

  const peopleWithVacations = useMemo(() => {
    const vacationPersonIds = new Set(weekVacations.map((v) => v.personId));
    return people.filter((p) => vacationPersonIds.has(p.id));
  }, [people, weekVacations]);

  const selectedPersonName = people.find((p) => p.id === selectedPerson)?.name;

  return (
    <div className="vacations-page">
      <div className="page-header">
        <h1>Gestione Ferie</h1>
        <p className="subtitle">Registra e visualizza i periodi di ferie</p>
      </div>

      <div className="vacations-container">
        <div className="week-display-card">
          <div className="vac-week-nav">
            <button onClick={goToPreviousWeek}>← Precedente</button>
            <div>
              <h3>{formatDayLabel(weekDays[0])} - {formatDayLabel(weekDays[4])}</h3>
            </div>
            <button onClick={goToNextWeek}>Successiva →</button>
            <button onClick={goToToday} className="secondary">Oggi</button>
          </div>
          <div className="week-table-container">
            <table className="week-table">
              <thead>
                <tr>
                  <th className="name-col">Persona</th>
                  {weekDays.map((d, i) => (
                    <th key={i} className="day-col">
                      <div className="day-name">{getDayAbbr(i)}</div>
                      <div className="day-date">{formatDayLabel(d)}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {peopleWithVacations.length > 0 ? (
                  peopleWithVacations.map((person) => (
                    <tr key={person.id}>
                      <td className="name-col">{person.name}</td>
                      {weekDays.map((d) => {
                        const date = toISODate(d);
                        const hasVacation = isVacation(person.id, date);
                        return (
                          <td key={date} className={`day-col ${hasVacation ? 'vacation' : ''}`}>
                            {hasVacation ? 'F' : ''}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '20px', color: 'var(--color-text-light)' }}>
                      Nessuno in ferie questa settimana
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="selector-card">
          <h3>Seleziona Persona</h3>
          <ModernSelect
            value={selectedPerson || ''}
            onChange={(value) => setSelectedPerson(value ? Number(value) : null)}
            placeholder="-- Scegli una persona --"
            options={[
              { value: '', label: '-- Scegli una persona --' },
              ...people.map((p) => ({ value: p.id, label: p.name })),
            ]}
          />
        </div>

        {selectedPerson && (
          <div className="add-vacation-card">
            <h3>Aggiungi Periodo di Ferie</h3>
            <div className="form-grid">
              <div className="form-group">
                <DatePicker
                  value={dateStart}
                  onChange={setDateStart}
                  label="Data Inizio"
                />
              </div>
              <div className="form-group">
                <DatePicker
                  value={dateEnd}
                  onChange={setDateEnd}
                  label="Data Fine"
                />
              </div>
            </div>
            {dateStart && dateEnd && (
              <div className="days-info">
                Totale: <strong>{getDaysCount(dateStart, dateEnd)} giorni</strong>
              </div>
            )}
            <button className="primary full-width" onClick={addVacation}>
              Aggiungi Ferie
            </button>
          </div>
        )}

        {selectedPersonName && (
          <div className="vacations-list-card">
            <h3>Ferie di {selectedPersonName}</h3>
            {vacations.length > 0 ? (
              <div className="vacations-list">
                {vacations.map((vacation) => (
                  <div key={vacation.id} className="vacation-item">
                    <div className="vacation-content">
                      <div className="vacation-dates">
                        {vacation.dateStart} → {vacation.dateEnd}
                      </div>
                      <div className="vacation-days">
                        {getDaysCount(vacation.dateStart, vacation.dateEnd)} giorni
                      </div>
                    </div>
                    <button
                      className="danger"
                      onClick={() => removeVacation(vacation.id)}
                    >
                      Rimuovi
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-message">
                Nessun periodo di ferie registrato
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
