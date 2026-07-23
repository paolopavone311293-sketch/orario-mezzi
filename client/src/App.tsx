import { createContext, useEffect, useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import './styles/app.css';
import './styles/sidebar.css';
import './styles/dashboard.css';
import './styles/attendance.css';
import './styles/vehicles.css';
import './styles/vacations.css';
import './styles/report.css';
import './styles/notes.css';
import './styles/settings.css';
import './styles/dialog.css';
import './styles/select.css';
import './styles/datepicker.css';
import { Sidebar } from './components/Sidebar';
import { DialogProvider } from './components/DialogContext';
import { DashboardPage } from './pages/DashboardPage';
import { AttendancePage } from './pages/AttendancePage';
import { VehiclesPage } from './pages/VehiclesPage';
import { VacationsPage } from './pages/VacationsPage';
import { ReportPage } from './pages/ReportPage';
import { NotesPage } from './pages/NotesPage';
import { SettingsPage } from './pages/SettingsPage';

export const EditContext = createContext<{
  editVehicles: boolean;
  setEditVehicles: (value: boolean) => void;
  editNames: boolean;
  setEditNames: (value: boolean) => void;
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
}>({
  editVehicles: false,
  setEditVehicles: () => {},
  editNames: false,
  setEditNames: () => {},
  darkMode: false,
  setDarkMode: () => {},
});

function App() {
  const [editVehicles, setEditVehicles] = useState(false);
  const [editNames, setEditNames] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_KEY;
    console.log('=== APP DEBUG ===');
    console.log('VITE_SUPABASE_URL:', url);
    console.log('VITE_SUPABASE_KEY:', key ? key.substring(0, 20) + '...' : 'UNDEFINED');
    if (!url || !key) {
      alert('⚠️ DEBUG: Supabase credentials missing!\nURL: ' + url + '\nKey: ' + (key ? 'DEFINED' : 'UNDEFINED'));
    }
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

  return (
    <DialogProvider>
      <EditContext.Provider value={{ editVehicles, setEditVehicles, editNames, setEditNames, darkMode, setDarkMode }}>
        <HashRouter>
          <div className="app">
            <Sidebar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/presenze" element={<AttendancePage />} />
                <Route path="/mezzi" element={<VehiclesPage />} />
                <Route path="/ferie" element={<VacationsPage />} />
                <Route path="/report" element={<ReportPage />} />
                <Route path="/note" element={<NotesPage />} />
                <Route path="/impostazioni" element={<SettingsPage />} />
              </Routes>
            </main>
          </div>
        </HashRouter>
      </EditContext.Provider>
    </DialogProvider>
  );
}

export default App;
