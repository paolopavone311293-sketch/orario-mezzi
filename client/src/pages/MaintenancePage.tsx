import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import type { MaintenanceApi } from '../lib/api';
import { DatePicker } from '../components/DatePicker';
import type { Vehicle } from '../lib/types';
import '../styles/maintenance.css';

type Tipo = 'motorino' | 'auto';

interface Rec {
  scadenza: string | null;
  km: number | null;
  tipo: Tipo;
}

interface MaintenancePageProps {
  title: string;
  subtitle: string;
  dataApi: MaintenanceApi;
  /** 'date' = ordina/colora per scadenza (Revisioni); 'km' = per km rimanenti (Tagliandi) */
  variant: 'date' | 'km';
}

const LIMIT_KEYS: Record<Tipo, string> = {
  motorino: 'tagliandi_limite_motorino',
  auto: 'tagliandi_limite_auto',
};

export function MaintenancePage({ title, subtitle, dataApi, variant }: MaintenancePageProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [records, setRecords] = useState<Record<number, Rec>>({});
  const [limits, setLimits] = useState<Record<Tipo, number>>({ motorino: 5000, auto: 20000 });

  useEffect(() => {
    api.zones.list().then((zones) => {
      setVehicles(((zones as any)._allVehicles as Vehicle[]) || []);
    });
    setRecords({});
    dataApi.list().then((rows) => {
      const map: Record<number, Rec> = {};
      rows.forEach((r) => {
        map[r.vehicleId] = {
          scadenza: r.scadenza,
          km: r.km,
          tipo: r.tipo === 'motorino' ? 'motorino' : 'auto',
        };
      });
      setRecords(map);
    });
    if (variant === 'km') {
      api.settings.all().then((s) => {
        setLimits({
          motorino: Number(s[LIMIT_KEYS.motorino]) || 5000,
          auto: Number(s[LIMIT_KEYS.auto]) || 20000,
        });
      });
    }
  }, [dataApi, variant]);

  const rec = (id: number): Rec => records[id] || { scadenza: null, km: null, tipo: 'auto' };

  /** Km che mancano al prossimo tagliando (null se non ci sono km inseriti) */
  const rimanenti = (id: number): number | null => {
    const r = rec(id);
    if (r.km === null) return null;
    return limits[r.tipo] - r.km;
  };

  const byPosition = useMemo(
    () => [...vehicles].sort((a, b) => (a.position || 0) - (b.position || 0)),
    [vehicles]
  );

  // Il N° resta quello del mezzo (come in Zone e Mezzi), anche quando la
  // tabella viene riordinata per scadenza / km rimanenti.
  const numberOf = useMemo(() => {
    const map: Record<number, string> = {};
    byPosition.forEach((v, i) => {
      map[v.id] = v.code || String(i + 1);
    });
    return map;
  }, [byPosition]);

  const sortedVehicles = useMemo(() => {
    const list = [...byPosition];
    if (variant === 'date') {
      // Scadenza più vicina in cima; senza data in fondo
      return list.sort((a, b) => {
        const sa = records[a.id]?.scadenza || null;
        const sb = records[b.id]?.scadenza || null;
        if (sa && sb) return sa < sb ? -1 : sa > sb ? 1 : 0;
        if (sa) return -1;
        if (sb) return 1;
        return (a.position || 0) - (b.position || 0);
      });
    }
    // Meno km rimanenti in cima; senza km in fondo
    return list.sort((a, b) => {
      const ra = rimanenti(a.id);
      const rb = rimanenti(b.id);
      if (ra !== null && rb !== null) return ra - rb;
      if (ra !== null) return -1;
      if (rb !== null) return 1;
      return (a.position || 0) - (b.position || 0);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [byPosition, records, limits, variant]);

  const save = async (id: number, patch: Partial<Rec>) => {
    const next: Rec = { ...rec(id), ...patch };
    setRecords((p) => ({ ...p, [id]: next }));
    try {
      await dataApi.set(id, next.scadenza, next.km, next.tipo);
    } catch (err) {
      console.error('Errore salvataggio:', err);
    }
  };

  const saveLimit = async (tipo: Tipo, value: string) => {
    const n = Number(value);
    if (!n || n <= 0) return;
    setLimits((p) => ({ ...p, [tipo]: n }));
    try {
      await api.settings.set(LIMIT_KEYS[tipo], String(n));
    } catch (err) {
      console.error('Errore salvataggio limite:', err);
    }
  };

  /** Colore riga: giallo 1 mese / arancione 2 settimane / rosso 1 settimana o scaduta */
  const dateClass = (scadenza: string | null) => {
    if (!scadenza) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.floor((new Date(scadenza).getTime() - today.getTime()) / 86400000);
    if (diff <= 7) return 'rossa';
    if (diff <= 14) return 'arancione';
    if (diff <= 30) return 'gialla';
    return '';
  };

  /** Colore riga in base ai km che mancano, in proporzione al limite del tipo */
  const kmClass = (id: number) => {
    const left = rimanenti(id);
    if (left === null) return '';
    const limit = limits[rec(id).tipo];
    if (left <= limit * 0.05) return 'rossa'; // ultimi 5% o superato
    if (left <= limit * 0.1) return 'arancione'; // ultimi 10%
    if (left <= limit * 0.2) return 'gialla'; // ultimi 20%
    return '';
  };

  const isKm = variant === 'km';

  return (
    <div className="maintenance-page">
      <div className="page-header">
        <h1>{title}</h1>
        <p className="subtitle">{subtitle}</p>
      </div>

      {isKm && (
        <div className="limits-card">
          <div className="limit-field">
            <label>🛵 Limite motorini (km)</label>
            <input
              type="number"
              defaultValue={limits.motorino}
              key={`m-${limits.motorino}`}
              onBlur={(e) => saveLimit('motorino', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
            />
          </div>
          <div className="limit-field">
            <label>🚗 Limite auto (km)</label>
            <input
              type="number"
              defaultValue={limits.auto}
              key={`a-${limits.auto}`}
              onBlur={(e) => saveLimit('auto', e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
              }}
            />
          </div>
        </div>
      )}

      <div className="maintenance-table-container">
        <table className="maintenance-table">
          <thead>
            <tr>
              <th className="col-numero">N°</th>
              <th className="col-targa">Targa</th>
              {isKm && <th className="col-tipo">Tipo</th>}
              {!isKm && <th className="col-scadenza">Scadenza</th>}
              <th className="col-km">Km</th>
              {isKm && <th className="col-rimanenti">Mancano</th>}
            </tr>
          </thead>
          <tbody>
            {sortedVehicles.map((v) => {
              const r = rec(v.id);
              const left = rimanenti(v.id);
              return (
                <tr key={v.id} className={isKm ? kmClass(v.id) : dateClass(r.scadenza)}>
                  <td className="col-numero">{numberOf[v.id]}</td>
                  <td className="col-targa">{v.name || '—'}</td>

                  {isKm && (
                    <td className="col-tipo">
                      <button
                        type="button"
                        className={`tipo-badge ${r.tipo}`}
                        onClick={() => save(v.id, { tipo: r.tipo === 'auto' ? 'motorino' : 'auto' })}
                        title="Clicca per cambiare tipo"
                      >
                        {r.tipo === 'motorino' ? '🛵 Motorino' : '🚗 Auto'}
                      </button>
                    </td>
                  )}

                  {!isKm && (
                    <td className="col-scadenza">
                      <DatePicker value={r.scadenza || ''} onChange={(d) => save(v.id, { scadenza: d || null })} />
                    </td>
                  )}

                  <td className="col-km">
                    <input
                      type="number"
                      className="km-input"
                      value={r.km ?? ''}
                      placeholder="—"
                      onChange={(e) =>
                        setRecords((p) => ({
                          ...p,
                          [v.id]: { ...rec(v.id), km: e.target.value === '' ? null : Number(e.target.value) },
                        }))
                      }
                      onBlur={(e) =>
                        save(v.id, { km: e.target.value === '' ? null : Number(e.target.value) })
                      }
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                    />
                  </td>

                  {isKm && (
                    <td className="col-rimanenti">
                      {left === null ? (
                        <span className="km-left none">—</span>
                      ) : left <= 0 ? (
                        <span className="km-left over">superato</span>
                      ) : (
                        <span className="km-left">{left.toLocaleString('it-IT')} km</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
