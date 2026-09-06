import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { chiaviDi, pianiDaImpostazioni, tuttiITipi } from '../lib/tagliandi';
import type { Piano, Tipo, TipoMezzo } from '../lib/tagliandi';
import '../styles/maintenance.css';

/**
 * Ogni quanti km tocca il tagliando, tipo di mezzo per tipo di mezzo.
 *
 * Sono due numeri e non uno perche' il primo tagliando non cade sempre allo
 * stesso passo degli altri: i Pulse 4 vogliono il primo a 4.000 km e poi uno
 * ogni 8.100. Dove i due numeri coincidono (motorini, auto) e' il caso
 * semplice di sempre.
 *
 * Stanno in una pagina a parte e non in cima ai Tagliandi: si impostano una
 * volta sola, mentre l'elenco dei mezzi si guarda tutti i giorni.
 */
export function KmTagliandiPage() {
  const [piani, setPiani] = useState<Record<TipoMezzo, Piano>>({});
  const [tipi, setTipi] = useState<Tipo[]>([]);
  const [salvato, setSalvato] = useState<string | null>(null);

  // i tipi aggiunti dalle Impostazioni stanno anche loro nelle impostazioni
  useEffect(() => {
    api.settings.all().then((s) => {
      const elenco = tuttiITipi(s);
      setTipi(elenco);
      setPiani(pianiDaImpostazioni(s, elenco));
    });
  }, []);

  const salva = async (tipo: TipoMezzo, quale: 'primo' | 'ogni', value: string) => {
    const n = Number(value);
    if (!n || n <= 0) return;
    if (piani[tipo][quale] === n) return;

    setPiani((p) => ({ ...p, [tipo]: { ...p[tipo], [quale]: n } }));
    try {
      await api.settings.set(chiaviDi(tipo)[quale], String(n));
      setSalvato(`${tipo}-${quale}`);
      setTimeout(() => setSalvato(null), 2000);
    } catch (err) {
      console.error('Errore salvataggio km del tipo:', err);
    }
  };

  return (
    <div className="maintenance-page">
      <div className="page-header">
        <h1>KM tagliandi</h1>
        <p className="subtitle">Ogni quanti km tocca il tagliando, per tipo di mezzo</p>
      </div>

      <div className="limits-card">
        {tipi.map(({ valore, etichetta, icona }) => (
          <div className="limit-tipo" key={valore}>
            <div className="limit-tipo-nome">
              {icona} {etichetta}
            </div>
            <div className="limit-field">
              <label>Primo tagliando (km)</label>
              <input
                type="number"
                defaultValue={piani[valore].primo}
                key={`p-${valore}-${piani[valore].primo}`}
                onBlur={(e) => salva(valore, 'primo', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
              />
            </div>
            <div className="limit-field">
              <label>Poi ogni (km)</label>
              <input
                type="number"
                defaultValue={piani[valore].ogni}
                key={`o-${valore}-${piani[valore].ogni}`}
                onBlur={(e) => salva(valore, 'ogni', e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
              />
            </div>
            {salvato === `${valore}-primo` || salvato === `${valore}-ogni` ? (
              <div className="limit-salvato">✓ salvato</div>
            ) : null}
          </div>
        ))}
      </div>

      <p className="nota-km-tagliandi">
        Il tipo di ogni mezzo si sceglie nella pagina <strong>Tagliandi</strong>, toccando il
        tondino nella colonna Tipo.
      </p>
    </div>
  );
}
