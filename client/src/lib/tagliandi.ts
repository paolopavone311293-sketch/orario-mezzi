/**
 * I tagliandi, in un posto solo: quali sono i tipi di mezzo, ogni quanti km
 * tocca il tagliando a ognuno, e quanti km mancano al prossimo.
 *
 * Sta qui e non nelle pagine perche' lo usano sia la pagina Tagliandi sia gli
 * avvisi della Dashboard: quando il conto era scritto due volte, le due si
 * sono contraddette. Se serve altrove, importarlo — non ricopiarlo.
 */

export type TipoMezzo = 'motorino' | 'auto' | 'pulse4';

/**
 * I km di un tipo di mezzo. Sono due numeri perche' il primo tagliando non
 * cade sempre allo stesso passo degli altri: i Pulse 4 vogliono il primo a
 * 4.000 km e poi uno ogni 8.100. Dove i due numeri coincidono (motorini,
 * auto) il conto e' quello di sempre.
 */
export interface Piano {
  /** Km del primo tagliando, quando non ne e' ancora stato fatto nessuno. */
  primo: number;
  /** Km fra un tagliando e il successivo. */
  ogni: number;
}

export const TIPI: { valore: TipoMezzo; etichetta: string; icona: string }[] = [
  { valore: 'motorino', etichetta: 'Motorino', icona: '🛵' },
  { valore: 'auto', etichetta: 'Auto', icona: '🚗' },
  { valore: 'pulse4', etichetta: 'Pulse 4', icona: '🏍️' },
];

export const PIANI_PREDEFINITI: Record<TipoMezzo, Piano> = {
  motorino: { primo: 5000, ogni: 5000 },
  auto: { primo: 20000, ogni: 20000 },
  pulse4: { primo: 4000, ogni: 8100 },
};

/**
 * Le chiavi nella tabella `settings`. Quelle di `ogni` sono le vecchie
 * `tagliandi_limite_*`: cambiarle avrebbe fatto ripartire dai valori di
 * fabbrica i numeri gia' impostati.
 */
export const CHIAVI: Record<TipoMezzo, { primo: string; ogni: string }> = {
  motorino: { primo: 'tagliandi_primo_motorino', ogni: 'tagliandi_limite_motorino' },
  auto: { primo: 'tagliandi_primo_auto', ogni: 'tagliandi_limite_auto' },
  pulse4: { primo: 'tagliandi_primo_pulse4', ogni: 'tagliandi_limite_pulse4' },
};

/** Un tipo scritto nel database, riportato a uno di quelli che conosciamo. */
export function tipoValido(tipo: string | null | undefined): TipoMezzo {
  return TIPI.some((t) => t.valore === tipo) ? (tipo as TipoMezzo) : 'auto';
}

/** Il tipo dopo questo, girando in tondo: serve al tondino che si tocca. */
export function tipoSuccessivo(tipo: TipoMezzo): TipoMezzo {
  const i = TIPI.findIndex((t) => t.valore === tipo);
  return TIPI[(i + 1) % TIPI.length].valore;
}

export const etichettaTipo = (tipo: TipoMezzo) =>
  TIPI.find((t) => t.valore === tipo)?.etichetta || tipo;

export const iconaTipo = (tipo: TipoMezzo) => TIPI.find((t) => t.valore === tipo)?.icona || '🚗';

/**
 * I km di ogni tipo, letti dalle impostazioni salvate.
 *
 * Il primo tagliando non era salvato da nessuna parte finche' i due numeri
 * erano uno solo. Dove manca: se di fabbrica il tipo ha i due numeri uguali
 * (motorini, auto) vale l'intervallo impostato, cosi' chi ha gia' cambiato
 * il limite non se lo vede tornare indietro; dove invece sono diversi
 * (Pulse 4: 4.000 e poi 8.100) vale quello di fabbrica.
 */
export function pianiDaImpostazioni(s: Record<string, string>): Record<TipoMezzo, Piano> {
  const piani = {} as Record<TipoMezzo, Piano>;
  TIPI.forEach(({ valore }) => {
    const base = PIANI_PREDEFINITI[valore];
    const ogni = Number(s[CHIAVI[valore].ogni]) || base.ogni;
    const senzaPrimoSalvato = base.primo === base.ogni ? ogni : base.primo;
    piani[valore] = { primo: Number(s[CHIAVI[valore].primo]) || senzaPrimoSalvato, ogni };
  });
  return piani;
}

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
