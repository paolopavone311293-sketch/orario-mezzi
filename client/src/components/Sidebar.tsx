import { useContext, useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { EditContext } from '../App';
import '../styles/sidebar.css';

export function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { editVehicles, setEditVehicles } = useContext(EditContext);

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

        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
          <button
            onClick={() => setEditVehicles(!editVehicles)}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: editVehicles ? 'rgba(96, 165, 250, 0.3)' : 'rgba(255,255,255,0.1)',
              color: 'white',
              border: editVehicles ? '1px solid #60a5fa' : 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              transition: 'all 0.2s ease',
            }}
          >
            {editVehicles ? '✓ Modifica Targhe' : 'Modifica Targhe'}
          </button>
        </div>

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
