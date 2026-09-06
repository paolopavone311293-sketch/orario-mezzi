import { useContext, useEffect, useMemo, useState } from 'react';
import { EditContext } from '../App';
import { api } from '../lib/api';
import type { MaintenanceApi } from '../lib/api';
import { DatePicker } from '../components/DatePicker';
import { useDialog } from '../components/DialogContext';
import { formatISOShort, toISODate } from '../lib/date';
import {
  TIPI_BASE,
  TIPO_PREDEFINITO,
  etichettaTipo,
  iconaTipo,
  kmMancanti,
  pianiDaImpostazioni,
  pianoDi,
  prossimoTagliando,
  tipoSuccessivo,
  tipoValido,
  trattoDiRiferimento,
  tuttiITipi,
} from '../lib/tagliandi';
import type { Piano, Tipo as TipoElenco, TipoMezzo } from '../lib/tagliandi';
import type { Vehicle } from '../lib/types';
import '../styles/maintenance.css';

type Tipo = TipoMezzo;

interface Rec {
  /** Revisioni: la data di scadenza. Tagliandi: il giorno dell'ultimo fatto. */
  scadenza: string | null;
  /** Tagliandi: i km del contachilometri quando e' stato fatto l'ultimo. */
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

export function MaintenancePage({ title, subtitle, dataApi, variant }: MaintenancePageProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [records, setRecords] = useState<Record<number, Rec>>({});
  const [piani, setPiani] = useState<Record<Tipo, Piano>>({});
  const [tipi, setTipi] = useState<TipoElenco[]>(TIPI_BASE);
  const { confirm } = useDialog();
  // Il tipo si sceglie quando si aggiunge il mezzo, in Zone e Mezzi. Qui la
  // colonna serve solo a correggere, percio' compare con «Modifica Targhe».
  const { editVehicles } = useContext(EditContext);

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
          // si tiene il valore com'e' scritto: se e' un tipo tolto dalle
          // Impostazioni e poi rimesso, il mezzo se lo ritrova
          tipo: r.tipo || TIPO_PREDEFINITO,
        };
      });
      setRecords(map);
    });
    if (variant === 'km') {
      api.settings.all().then((s) => {
        const elenco = tuttiITipi(s);
        setTipi(elenco);
        setPiani(pianiDaImpostazioni(s, elenco));
      });
    }
  }, [dataApi, variant]);

  const VUOTO: Rec = { scadenza: null, km: null, tipo: 'auto' };
  const recDa = (mappa: Record<number, Rec>, id: number): Rec => mappa[id] || VUOTO;
  const rec = (id: number): Rec => recDa(records, id);

  /** I km sono una proprieta' del mezzo: condivisi tra Revisioni e Tagliandi */
  const kmOf = (id: number): number | null => {
    const v = vehicles.find((x) => x.id === id);
    return v?.km ?? null;
  };

  /**
   * Km che mancano al prossimo tagliando: si contano dall'ultimo fatto, e
   * finche' non ce n'e' uno si conta verso il primo tagliando del tipo.
   * null quando i km del mezzo non sono stati scritti.
   */
  const rimanenti = (id: number): number | null => {
    const km = kmOf(id);
    if (km === null) return null;
    const r = rec(id);
    return kmMancanti(km, r.km, pianoDi(piani, r.tipo));
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
  }, [byPosition, records, piani, variant, vehicles]);

  const save = async (id: number, patch: Partial<Rec>) => {
    const next: Rec = { ...rec(id), ...patch };
    setRecords((p) => ({ ...p, [id]: next }));
    try {
      await dataApi.set(id, next.scadenza, next.km, next.tipo);
    } catch (err) {
      console.error('Errore salvataggio:', err);
    }
  };

  const saveKm = async (id: number, value: string) => {
    const km = value.trim() === '' ? null : Number(value);
    setVehicles((prev) => prev.map((v) => (v.id === id ? { ...v, km } : v)));
    try {
      await api.vehicles.setKm(id, km);
    } catch (err) {
      console.error('Errore salvataggio km:', err);
    }
  };

  /**
   * «Fatto»: segna il tagliando ai km che il mezzo ha adesso e fa ripartire
   * il conteggio da li'. La data serve solo a ricordarsi quando e' stato.
   */
  const segnaTagliando = (v: Vehicle) => {
    const km = kmOf(v.id);
    if (km === null) return;
    const prossimo = prossimoTagliando(km, pianoDi(piani, rec(v.id).tipo));
    confirm({
      title: 'Tagliando fatto',
      message:
        `${v.name || 'Mezzo'}: segno il tagliando a ${km.toLocaleString('it-IT')} km. ` +
        `Il conteggio riparte da qui, il prossimo tocca a ${prossimo.toLocaleString('it-IT')} km.`,
      confirmText: 'Sì, fatto',
      onConfirm: () => save(v.id, { km, scadenza: toISODate(new Date()) }),
    });
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

  /** Colore riga in base ai km che mancano, in proporzione al tratto in corso */
  const kmClass = (id: number) => {
    const left = rimanenti(id);
    if (left === null) return '';
    const r = rec(id);
    const tratto = trattoDiRiferimento(r.km, pianoDi(piani, r.tipo));
    if (left <= tratto * 0.05) return 'rossa'; // ultimi 5% o superato
    if (left <= tratto * 0.1) return 'arancione'; // ultimi 10%
    if (left <= tratto * 0.2) return 'gialla'; // ultimi 20%
    return '';
  };

  const isKm = variant === 'km';

  return (
    <div className="maintenance-page">
      <div className="page-header">
        <h1>{title}</h1>
        <p className="subtitle">{subtitle}</p>
      </div>


      <div className="maintenance-table-container">
        <table className={`maintenance-table ${isKm && editVehicles ? 'con-tipo' : ''}`}>
          <thead>
            <tr>
              <th className="col-numero">N°</th>
              <th className="col-targa">Targa</th>
              {isKm && editVehicles && <th className="col-tipo">Tipo</th>}
              {!isKm && <th className="col-scadenza">Scadenza</th>}
              <th className="col-km">Km</th>
              {isKm && <th className="col-ultimo">Ultimo tagliando</th>}
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

                  {isKm && editVehicles && (
                    <td className="col-tipo">
                      <button
                        type="button"
                        className={`tipo-badge ${tipoValido(r.tipo, tipi)}`}
                        onClick={() => save(v.id, { tipo: tipoSuccessivo(tipoValido(r.tipo, tipi), tipi) })}
                        title={`${etichettaTipo(tipoValido(r.tipo, tipi), tipi)} — clicca per cambiare tipo`}
                      >
                        {iconaTipo(tipoValido(r.tipo, tipi), tipi)}
                        <span className="tipo-parola"> {etichettaTipo(tipoValido(r.tipo, tipi), tipi)}</span>
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
                      value={kmOf(v.id) ?? ''}
                      placeholder="—"
                      onChange={(e) =>
                        setVehicles((prev) =>
                          prev.map((x) =>
                            x.id === v.id
                              ? { ...x, km: e.target.value === '' ? null : Number(e.target.value) }
                              : x
                          )
                        )
                      }
                      onBlur={(e) => saveKm(v.id, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      }}
                    />
                  </td>

                  {isKm && (
                    <td className="col-ultimo">
                      <div className="ultimo-cella">
                        <input
                          type="number"
                          className="km-input"
                          value={r.km ?? ''}
                          placeholder="—"
                          title="Km segnati quando è stato fatto l'ultimo tagliando"
                          onChange={(e) =>
                            setRecords((prev) => ({
                              ...prev,
                              [v.id]: {
                                ...recDa(prev, v.id),
                                km: e.target.value === '' ? null : Number(e.target.value),
                              },
                            }))
                          }
                          onBlur={(e) =>
                            save(v.id, { km: e.target.value === '' ? null : Number(e.target.value) })
                          }
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                          }}
                        />
                        <button
                          type="button"
                          className="fatto-btn"
                          disabled={kmOf(v.id) === null}
                          onClick={() => segnaTagliando(v)}
                          title={
                            kmOf(v.id) === null
                              ? 'Prima scrivi i km del mezzo'
                              : 'Segna il tagliando fatto adesso'
                          }
                        >
                          ✅ Fatto
                        </button>
                      </div>
                      {r.scadenza && <span className="ultimo-data">{formatISOShort(r.scadenza)}</span>}
                    </td>
                  )}

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
