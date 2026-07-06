export const DAY_NAMES = ['Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato', 'Domenica'];

export function toISODate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function startOfWeek(d: Date): Date {
  const date = new Date(d);
  const dayIndex = (date.getDay() + 6) % 7; // Monday = 0
  date.setDate(date.getDate() - dayIndex);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(d: Date, amount: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + amount);
  return date;
}

export function getWeekDays(weekStart: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export function formatDayLabel(d: Date): string {
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' });
}

export function formatFullDate(d: Date): string {
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
