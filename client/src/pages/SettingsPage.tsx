import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Zone } from '../lib/types';
import ExcelJS, { type BorderStyle } from 'exceljs';
import '../styles/settings.css';

export function SettingsPage() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    loadZones();
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const loadZones = async () => {
    const zonesData = await api.zones.list();
    setZones(zonesData);
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
            <label className="toggle-label">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
              />
              <span className="toggle-text">
                {darkMode ? '🌙 Modalità scura' : '☀️ Modalità chiara'}
              </span>
            </label>
          </div>
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
