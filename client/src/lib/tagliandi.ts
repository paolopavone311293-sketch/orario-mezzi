/**
 * Il conto dei km che mancano al prossimo tagliando, in un posto solo:
 * lo usano sia la pagina Tagliandi sia gli avvisi della Dashboard, e se
 * ognuna si facesse il suo conto finirebbero per dire cose diverse.
 *
 * Si parte dai km segnati sul contachilometri quando e' stato fatto
 * l'ultimo tagliando. Finche' non ne e' stato registrato nessuno si
 * conta dall'inizio (zero km), com'era prima che esistesse il tasto.
 */
export function kmMancanti(
  kmMezzo: number,
  kmUltimoTagliando: number | null | undefined,
  limite: number
): number {
  return (kmUltimoTagliando ?? 0) + limite - kmMezzo;
}
