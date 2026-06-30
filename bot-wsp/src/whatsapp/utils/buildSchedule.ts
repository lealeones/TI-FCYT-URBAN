const TZ = "America/Argentina/Cordoba";
const dayNames = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const monthNames = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];

type Slot = { dow: number; month: number; year: number; date: Date; timeRange: string; dateLabel: string };

/** Cuenta cuántas veces aparece un día de semana (dow) en un mes/año dado */
function countDowInMonth(year: number, month: number, dow: number): number {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    if (new Date(year, month, d).getDay() === dow) count++;
  }
  return count;
}

function parseSlots(ranges: any[]): Slot[] {
  const slots: Slot[] = [];
  for (const r of ranges) {
    if (!r?.start || !r?.end) continue;
    const start = new Date(r.start);
    const end = new Date(r.end);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) continue;
    const hStart = start.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ });
    const hEnd = end.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ });
    slots.push({
      dow: start.getDay(),
      month: start.getMonth(),
      year: start.getFullYear(),
      date: start,
      timeRange: `${hStart}–${hEnd}`,
      dateLabel: `${start.getDate()}/${monthNames[start.getMonth()]}`,
    });
  }
  // ordenar por fecha
  return slots.sort((a, b) => a.date.getTime() - b.date.getTime());
}

/**
 * Agrupa slots por (día de semana + rango horario).
 * Dentro de cada grupo, sub-agrupa por mes:
 *   - Mes regular: sus slots cubren TODOS los días `dow` de ese mes
 *   - Si hay ≥2 meses regulares → se resumen como "Todos los X de los meses A, B..."
 *   - El resto (meses incompletos o <2 meses regulares) → fechas individuales
 * Todo el output se ordena cronológicamente por la primera fecha de cada ítem.
 */
function buildRecurringSchedule(slots: Slot[]): string {
  if (!slots.length) return "—";

  type OutputItem = { sortKey: Date; text: string };

  // Agrupar por dow+timeRange
  const groups = new Map<string, Slot[]>();
  for (const s of slots) {
    const key = `${s.dow}|${s.timeRange}`;
    const arr = groups.get(key) ?? [];
    arr.push(s);
    groups.set(key, arr);
  }

  const items: OutputItem[] = [];

  for (const [key, group] of groups) {
    const dow = Number(key.split("|")[0]);
    const timeRange = group[0].timeRange;
    const dayName = dayNames[dow];

    // Sub-agrupar por año+mes
    const byMonth = new Map<string, Slot[]>();
    for (const s of group) {
      const k = `${s.year}|${s.month}`;
      const arr = byMonth.get(k) ?? [];
      arr.push(s);
      byMonth.set(k, arr);
    }

    const regularMonths: { year: number; month: number; firstDate: Date }[] = [];
    const isolatedSlots: Slot[] = [];

    for (const [monthKey, monthSlots] of byMonth) {
      const [year, month] = monthKey.split("|").map(Number);
      const expected = countDowInMonth(year, month, dow);
      const sorted = [...monthSlots].sort((a, b) => a.date.getTime() - b.date.getTime());
      if (monthSlots.length === expected) {
        regularMonths.push({ year, month, firstDate: sorted[0].date });
      } else {
        isolatedSlots.push(...sorted);
      }
    }

    // Fechas aisladas → un ítem por fecha
    for (const s of isolatedSlots) {
      items.push({ sortKey: s.date, text: `${dayName} ${s.dateLabel} ${timeRange}` });
    }

    // Meses regulares
    if (regularMonths.length >= 2) {
      regularMonths.sort((a, b) => a.year !== b.year ? a.year - b.year : a.month - b.month);
      const monthsStr = regularMonths.map(({ month }) => monthNames[month]).join(", ");
      items.push({
        sortKey: regularMonths[0].firstDate,
        text: `Todos los ${dayName} de los meses ${monthsStr} ${timeRange}`,
      });
    } else {
      // < 2 meses regulares → también listar sus fechas individualmente
      for (const { year, month } of regularMonths) {
        for (const s of byMonth.get(`${year}|${month}`) ?? []) {
          items.push({ sortKey: s.date, text: `${dayName} ${s.dateLabel} ${timeRange}` });
        }
      }
    }
  }

  // Ordenar todo cronológicamente por la primera fecha de cada ítem
  items.sort((a, b) => a.sortKey.getTime() - b.sortKey.getTime());
  return items.map(i => i.text).join(", ");
}

export const buildSchedule = (clase: any): string => {
  // ONE_TIME: viene startDate / endDate (no dates[])
  if (clase?.type === 'ONE_TIME') {
    const s = clase?.startDate ? new Date(clase.startDate) : null;
    const e = clase?.endDate ? new Date(clase.endDate) : null;
    if (!s || !e || isNaN(s.getTime()) || isNaN(e.getTime())) return "—";

    const dow = s.getDay();
    const dateStr = `${s.getDate()}/${monthNames[s.getMonth()]}`;
    const hStart = s.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ });
    const hEnd = e.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ });
    return `${dayNames[dow]} ${dateStr} ${hStart}–${hEnd}`;
  }

  // RECURRING (u otros): usar dates[]
  const ranges = Array.isArray(clase?.dates) ? clase.dates : [];
  if (!ranges.length) return "—";

  return buildRecurringSchedule(parseSlots(ranges));
};
