import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { toISODate, formatFullDate } from '../lib/date';
import type { Person, Zone, Assignment, AttendanceRecord } from '../lib/types';
import '../styles/dashboard.css';

export function DashboardPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);

  const today = toISODate(new Date());

  useEffect(() => {
    Promise.all([
      api.people.list().then(setPeople),
      api.zones.list().then(setZones),
      api.attendance.range(today, today).then(setAttendance),
      api.assignments.forDate(today).then(setAssignments),
    ]);
  }, []);

  const totalPeople = people.length;
  const absentToday = attendance.filter((a) => a.status === 'absent').length;
  const presentToday = totalPeople - absentToday;
  const totalVehicles = zones.reduce((acc, z) => acc + z.vehicles.length, 0);
  const vehiclesInRepair = zones.reduce((acc, z) => acc + z.vehicles.filter((v) => v.inRepair).length, 0);
  const assignmentsToday = assignments.length;

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <h1>Dashboard</h1>
        <p className="subtitle">Panoramica della giornata di {formatFullDate(new Date())}</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card highlight-success">
          <div className="stat-icon">✓</div>
          <div className="stat-content">
            <div className="stat-value">{presentToday}</div>
            <div className="stat-label">Presenti Oggi</div>
          </div>
        </div>

        <div className="stat-card highlight-danger">
          <div className="stat-icon">✗</div>
          <div className="stat-content">
            <div className="stat-value">{absentToday}</div>
            <div className="stat-label">Assenti Oggi</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">🚗</div>
          <div className="stat-content">
            <div className="stat-value">{totalVehicles}</div>
            <div className="stat-label">Mezzi Attivi</div>
          </div>
        </div>

        <div className="stat-card highlight-warning">
          <div className="stat-icon">🔧</div>
          <div className="stat-content">
            <div className="stat-value">{vehiclesInRepair}</div>
            <div className="stat-label">Mezzi in Riparazione</div>
          </div>
        </div>
      </div>

      <div className="info-sections">
        <div className="info-card">
          <h3>Avvisi Rapidi</h3>
          <div className="info-content">
            {absentToday > 0 && (
              <div className="alert alert-warning">
                ⚠️ {absentToday} {absentToday === 1 ? 'persona' : 'persone'} assente oggi
              </div>
            )}
            {presentToday === totalPeople && (
              <div className="alert alert-success">
                ✓ Tutti presenti oggi
              </div>
            )}
            {assignmentsToday < totalVehicles && (
              <div className="alert alert-info">
                ℹ️ {totalVehicles - assignmentsToday} mezzi non ancora completamente assegnati
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
