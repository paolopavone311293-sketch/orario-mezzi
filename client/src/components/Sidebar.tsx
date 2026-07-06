import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import '../styles/sidebar.css';

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname]);

  return (
    <>
      <button className="sidebar-toggle" onClick={() => setIsOpen(!isOpen)}>
        ☰
      </button>

      {isOpen && <div className="sidebar-overlay" onClick={() => setIsOpen(false)} />}

      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            📅
          </div>
          <div className="sidebar-title">
            <h1>Gestione Operativa</h1>
            <p>Orario, Ferie e Mezzi</p>
          </div>
        </div>

        <nav className="sidebar-nav">
          <NavLink
            to="/"
            end
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setIsOpen(false)}
          >
            <span className="icon">📊</span>
            <span className="label">Dashboard</span>
          </NavLink>
          <NavLink
            to="/presenze"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setIsOpen(false)}
          >
            <span className="icon">👥</span>
            <span className="label">Presenze</span>
          </NavLink>
          <NavLink
            to="/mezzi"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setIsOpen(false)}
          >
            <span className="icon">🚗</span>
            <span className="label">Zone e Mezzi</span>
          </NavLink>
          <NavLink
            to="/ferie"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setIsOpen(false)}
          >
            <span className="icon">🏖️</span>
            <span className="label">Ferie</span>
          </NavLink>
          <NavLink
            to="/report"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setIsOpen(false)}
          >
            <span className="icon">🔧</span>
            <span className="label">Riparazioni</span>
          </NavLink>
          <NavLink
            to="/impostazioni"
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            onClick={() => setIsOpen(false)}
          >
            <span className="icon">⚙️</span>
            <span className="label">Impostazioni</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="avatar">AM</div>
            <div className="user-info">
              <p>Amministratore</p>
              <span>Admin</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
