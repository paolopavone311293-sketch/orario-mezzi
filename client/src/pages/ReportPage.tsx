import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { toISODate } from '../lib/date';
import { useDialog } from '../components/DialogContext';
import type { Zone } from '../lib/types';
import '../styles/report.css';

export function ReportPage() {
  const dialog = useDialog();
  const [zones, setZones] = useState<Zone[]>([]);
  const [repairDates, setRepairDates] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);

  const loadZones = () => {
    setLoading(true);
    Promise.all([
      api.zones.list().then(setZones),
      api.repairs.dates().then(setRepairDates),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadZones();
  }, []);

  const formatRepairDate = (iso: string) => {
    const [, m, d] = iso.split('-');
    return `${d}/${m}`;
  };

  const updateVehicleRepairStatus = (vehicleId: number, inRepair: boolean) => {
    const vehicle = zones.flatMap((z) => z.vehicles).find((v) => v.id === vehicleId);
    if (!vehicle) return;

    const title = inRepair ? 'Metti in Riparazione' : 'Riporta in Servizio';
    const message = inRepair
      ? `Mettere ${vehicle.name} in riparazione?`
      : `Riportare ${vehicle.name} in servizio?`;

    dialog.confirm({
      title,
      message,
      confirmText: inRepair ? 'Metti in Riparazione' : 'Riporta in Servizio',
      cancelText: 'Annulla',
      isDestructive: inRepair,
      onConfirm: async () => {
        try {
          await api.vehicles.update(vehicleId, { inRepair: inRepair ? 1 : 0 });
          if (inRepair) {
            await api.repairs.setDate(vehicleId, toISODate(new Date()));
          } else {
            await api.repairs.clearDate(vehicleId);
          }
          loadZones();
        } catch (err) {
          console.error('Error updating vehicle:', err);
        }
      },
    });
  };

  const allVehicles = zones.flatMap((z) => z.vehicles).sort((a, b) => (a.position || 0) - (b.position || 0));
  const inRepairCount = allVehicles.filter((v) => v.inRepair).length;

  return (
    <div className="report-page">
      <div className="page-header">
        <h1>Riparazioni ({inRepairCount})</h1>
        <p className="subtitle">Gestisci lo stato di riparazione dei mezzi</p>
      </div>

      <div className="vehicles-list">
        {allVehicles.length > 0 ? (
          allVehicles.map((vehicle) => (
            <div key={vehicle.id} className="vehicle-item">
              <div className="vehicle-info">
                <span className="vehicle-number">{vehicle.position}</span>
                <span className="vehicle-name">{vehicle.name}</span>
                <span className={`status-badge ${vehicle.inRepair ? 'in-repair' : 'active'}`}>
                  {vehicle.inRepair
                    ? `🔧 In Riparazione${repairDates[vehicle.id] ? ` dal ${formatRepairDate(repairDates[vehicle.id])}` : ''}`
                    : '✓ Attivo'}
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
