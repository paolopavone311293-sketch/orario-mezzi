/**
 * I tagliandi, in un posto solo: quali sono i tipi di mezzo, ogni quanti km
 * tocca il tagliando a ognuno, e quanti km mancano al prossimo.
 *
 * Sta qui e non nelle pagine perche' lo usano la pagina Tagliandi, quella dei
 * KM tagliandi, Zone e Mezzi e gli avvisi della Dashboard: quando il conto era
 * scritto due volte, le due si sono contraddette. Se serve altrove,
 * importarlo — non ricopiarlo.
 */

/**
 * Il codice di un tipo, quello che finisce nella colonna `tipo` della tabella
 * `tagliandi`. E' una stringa e non un elenco chiuso perche' i tipi si possono
 * aggiungere dalle Impostazioni.
 */
export type TipoMezzo = string;

export interface Tipo {
  valore: TipoMezzo;
  etichetta: string;
  icona: string;
}

/**
 * I km di un tipo di mezzo. Sono due numeri perche' il primo tagliando non
 * cade sempre allo stesso passo degli altri: i Pulse 4 vogliono il primo a
 * 4.000 km e poi uno ogni 8.100, i Ligier Pulse 3 L2e il primo a 12.000 e
 * poi ogni 6.000. Dove i due numeri coincidono il conto e' quello di sempre.
 */
export interface Piano {
  /** Km del primo tagliando, quando non ne e' ancora stato fatto nessuno. */
  primo: number;
  /** Km fra un tagliando e il successivo. */
  ogni: number;
}

/**
 * I tipi che l'app ha da sempre, nell'ordine in cui gira il tondino nella
 * tabella. L'icona deve bastare da sola: da telefono la parola non ci sta e
 * si vede solo quella.
 *
 * Il valore salvato di 'motorino' resta quello anche se a schermo si legge
 * «My Moover»: cambiarlo vorrebbe dire rifare le righe gia' scritte e le
 * chiavi delle impostazioni, per una parola.
 */
export const TIPI_BASE: Tipo[] = [
  { valore: 'motorino', etichetta: 'My Moover', icona: '🛵' },
  { valore: 'auto', etichetta: 'Auto', icona: '🚗' },
  { valore: 'pulse4', etichetta: 'Pulse 4', icona: '🏍️' },
  { valore: 'pulse3l5e', etichetta: 'Pulse 3 L5e', icona: '🛺' },
  { valore: 'pulse3l2e', etichetta: 'Pulse 3 L2e', icona: '🚙' },
];

export const TIPO_PREDEFINITO: TipoMezzo = 'auto';

/**
 * Dalle tabelle di manutenzione portate da Paolo:
 *   Pulse 4      4.000, 12.100, 20.200, 28.300, ...  -> primo 4.000, poi 8.100
 *   Pulse 3 L5e  gli stessi numeri del Pulse 4
 *   Pulse 3 L2e  12.000, 18.000, 24.000, 30.000, ... -> primo 12.000, poi 6.000
 */
export const PIANI_BASE: Record<TipoMezzo, Piano> = {
  motorino: { primo: 5000, ogni: 5000 },
  auto: { primo: 20000, ogni: 20000 },
  pulse4: { primo: 4000, ogni: 8100 },
  pulse3l5e: { primo: 4000, ogni: 8100 },
  pulse3l2e: { primo: 12000, ogni: 6000 },
};

/** Quanto vale un tipo aggiunto a mano finche' non gli si scrivono i km. */
export const PIANO_NUOVO: Piano = { primo: 5000, ogni: 5000 };

/** I tipi aggiunti dalle Impostazioni, tutti dentro una chiave sola. */
export const CHIAVE_TIPI = 'tagliandi_tipi_aggiunti';

/**
 * I tipi di sempre che sono stati tolti dalle Impostazioni. Si segnano invece
 * di cancellarli: i mezzi che li usavano tengono il valore scritto, e se il
 * tipo viene rimesso se lo ritrovano com'era, km compresi.
 */
export const CHIAVE_TIPI_TOLTI = 'tagliandi_tipi_tolti';

/**
 * Le chiavi nella tabella `settings` dove stanno i km di un tipo. Quelle di
 * `ogni` dei tipi storici sono le vecchie `tagliandi_limite_*`: cambiarle
 * avrebbe fatto ripartire dai valori di fabbrica i numeri gia' impostati.
 */
export const chiaviDi = (tipo: TipoMezzo) => ({
  primo: `tagliandi_primo_${tipo}`,
  ogni: `tagliandi_limite_${tipo}`,
});

/** Il codice ricavato dal nome scritto a mano: «Ape Piaggio» -> «ape-piaggio». */
export function codiceDaNome(nome: string): string {
  return nome
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // via gli accenti
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/** I tipi aggiunti a mano, letti dalle impostazioni. */
export function tipiAggiunti(s: Record<string, string>): Tipo[] {
  try {
    const letti = JSON.parse(s[CHIAVE_TIPI] || '[]');
    if (!Array.isArray(letti)) return [];
    return letti
      .filter((t) => t && typeof t.valore === 'string' && typeof t.etichetta === 'string')
      .map((t) => ({ valore: t.valore, etichetta: t.etichetta, icona: t.icona || '🚗' }));
  } catch {
    return []; // roba scritta storta: meglio i soli tipi di sempre che una pagina rotta
  }
}

/** I tipi di sempre che sono stati tolti. */
export function tipiTolti(s: Record<string, string>): TipoMezzo[] {
  try {
    const letti = JSON.parse(s[CHIAVE_TIPI_TOLTI] || '[]');
    return Array.isArray(letti) ? letti.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/** Tutti i tipi da mostrare: quelli di sempre rimasti, piu' quelli aggiunti. */
export function tuttiITipi(s: Record<string, string>): Tipo[] {
  const tolti = tipiTolti(s);
  return [...TIPI_BASE.filter((t) => !tolti.includes(t.valore)), ...tipiAggiunti(s)];
}

/**
 * Il tipo su cui ripiegare: l'«auto» finche' c'e', se no il primo rimasto.
 * Conta piu' di quanto sembri — i mezzi senza una riga nella tabella
 * dei tagliandi non hanno un tipo scritto da nessuna parte e finiscono qui.
 */
export const tipoPredefinitoFra = (tipi: Tipo[]): TipoMezzo =>
  tipi.some((t) => t.valore === TIPO_PREDEFINITO)
    ? TIPO_PREDEFINITO
    : tipi[0]?.valore || TIPO_PREDEFINITO;

/** Un tipo scritto nel database, riportato a uno di quelli che esistono. */
export function tipoValido(tipo: string | null | undefined, tipi: Tipo[] = TIPI_BASE): TipoMezzo {
  return tipi.some((t) => t.valore === tipo) ? (tipo as TipoMezzo) : tipoPredefinitoFra(tipi);
}

/** Il tipo dopo questo, girando in tondo: serve al tondino che si tocca. */
export function tipoSuccessivo(tipo: TipoMezzo, tipi: Tipo[] = TIPI_BASE): TipoMezzo {
  const i = tipi.findIndex((t) => t.valore === tipo);
  return tipi[(i + 1) % tipi.length].valore;
}

export const etichettaTipo = (tipo: TipoMezzo, tipi: Tipo[] = TIPI_BASE) =>
  tipi.find((t) => t.valore === tipo)?.etichetta || tipo;

export const iconaTipo = (tipo: TipoMezzo, tipi: Tipo[] = TIPI_BASE) =>
  tipi.find((t) => t.valore === tipo)?.icona || '🚗';

/**
 * I km di ogni tipo, letti dalle impostazioni salvate.
 *
 * Il primo tagliando non era salvato da nessuna parte finche' i due numeri
 * erano uno solo. Dove manca: se di fabbrica il tipo ha i due numeri uguali
 * (My Moover, auto) vale l'intervallo impostato, cosi' chi ha gia' cambiato
 * il limite non se lo vede tornare indietro; dove invece sono diversi
 * (Pulse 4: 4.000 e poi 8.100) vale quello di fabbrica.
 */
export function pianiDaImpostazioni(
  s: Record<string, string>,
  tipi: Tipo[] = tuttiITipi(s)
): Record<TipoMezzo, Piano> {
  const piani: Record<TipoMezzo, Piano> = {};
  tipi.forEach(({ valore }) => {
    const base = PIANI_BASE[valore] || PIANO_NUOVO;
    const chiavi = chiaviDi(valore);
    const ogni = Number(s[chiavi.ogni]) || base.ogni;
    const senzaPrimoSalvato = base.primo === base.ogni ? ogni : base.primo;
    piani[valore] = { primo: Number(s[chiavi.primo]) || senzaPrimoSalvato, ogni };
  });
  return piani;
}

/** Il piano di un tipo, con una risposta sensata anche se il tipo non c'e' piu'. */
export const pianoDi = (piani: Record<TipoMezzo, Piano>, tipo: TipoMezzo): Piano =>
  piani[tipo] || piani[TIPO_PREDEFINITO] || Object.values(piani)[0] || PIANO_NUOVO;

/** A quanti km cade il prossimo tagliando di un mezzo. */
export function prossimoTagliando(kmUltimoTagliando: number | null | undefined, piano: Piano) {
  return kmUltimoTagliando == null ? piano.primo : kmUltimoTagliando + piano.ogni;
}

/**
 * Km che mancano al prossimo tagliando: negativo o zero vuol dire superato.
 * Senza un tagliando segnato si conta verso il primo.
 */
export function kmMancanti(
  kmMezzo: number,
  kmUltimoTagliando: number | null | undefined,
  piano: Piano
): number {
  return prossimoTagliando(kmUltimoTagliando, piano) - kmMezzo;
}

/**
 * L'intervallo su cui misurare quanto si e' vicini: prima del primo
 * tagliando e' il primo tratto, dopo e' quello ricorrente. Serve ai colori,
 * che sono in percentuale.
 */
export const trattoDiRiferimento = (kmUltimoTagliando: number | null | undefined, piano: Piano) =>
  kmUltimoTagliando == null ? piano.primo : piano.ogni;
