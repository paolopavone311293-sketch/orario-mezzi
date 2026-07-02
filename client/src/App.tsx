import { createContext, useState } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import './styles/app.css';
import './styles/sidebar.css';
import './styles/dashboard.css';
import './styles/attendance.css';
import './styles/vehicles.css';
import './styles/vacations.css';
import './styles/report.css';
import './styles/settings.css';
import { Sidebar } from './components/Sidebar';
import { DashboardPage } from './pages/DashboardPage';
import { AttendancePage } from './pages/AttendancePage';
import { VehiclesPage } from './pages/VehiclesPage';
import { VacationsPage } from './pages/VacationsPage';
import { ReportPage } from './pages/ReportPage';
import { SettingsPage } from './pages/SettingsPage';

export const EditContext = createContext<{ editVehicles: boolean; setEditVehicles: (value: boolean) => void }>({
  editVehicles: false,
  setEditVehicles: () => {},
});

function App() {
  const [editVehicles, setEditVehicles] = useState(false);

  return (
    <EditContext.Provider value={{ editVehicles, setEditVehicles }}>
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
              <Route path="/impostazioni" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </HashRouter>
    </EditContext.Provider>
  );
}

export default App;
