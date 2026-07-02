import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Zone, Vehicle } from '../lib/types';
import '../styles/report.css';

export function ReportPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(false);

  const loadZones = () => {
    setLoading(true);
    api.zones.list().then(setZones).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadZones();
  }, []);

  const updateVehicleRepairStatus = async (vehicleId: number, inRepair: boolean) => {
    const vehicle = zones.flatMap((z) => z.vehicles).find((v) => v.id === vehicleId);
    if (!vehicle) return;

    const message = inRepair
      ? `Mettere ${vehicle.name} in riparazione?`
      : `Riportare ${vehicle.name} in servizio?`;

    if (!window.confirm(message)) return;

    try {
      await api.vehicles.update(vehicleId, { inRepair: inRepair ? 1 : 0 });
      loadZones();
    } catch (err) {
      console.error('Error updating vehicle:', err);
    }
  };

  const allVehicles = zones.flatMap((z) => z.vehicles);

  return (
    <div className="report-page">
      <div className="page-header">
        <h1>Riparazioni</h1>
        <p className="subtitle">Gestisci lo stato di riparazione dei mezzi</p>
      </div>

      <div className="vehicles-list">
        {allVehicles.length > 0 ? (
          allVehicles.map((vehicle) => (
            <div key={vehicle.id} className="vehicle-item">
              <div className="vehicle-info">
                <span className="vehicle-name">{vehicle.name}</span>
                <span className={`status-badge ${vehicle.inRepair ? 'in-repair' : 'active'}`}>
                  {vehicle.inRepair ? '🔧 In Riparazione' : '✓ Attivo'}
                </span>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={!!vehicle.inRepair}
                  onChange={(e) => updateVehicleRepairStatus(vehicle.id, e.target.checked)}
                  disabled={loading}
                />
                <span className="slider"></span>
              </label>
            </div>
          ))
        ) : (
          <p className="no-vehicles">Nessun mezzo disponibile</p>
        )}
      </div>
    </div>
  );
}
