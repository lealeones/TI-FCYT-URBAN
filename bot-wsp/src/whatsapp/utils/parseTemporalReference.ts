import * as chrono from 'chrono-node';

export const parseTemporalReference = (reference: string): { start: Date; end: Date } | null => {
  const parsed = chrono.es.parse(reference);

  if (parsed.length === 0) return null;

  const start = parsed[0].start.date();
  const end = parsed[0].end ? parsed[0].end.date() : new Date(start);
  end.setHours(start.getHours() + 1); // Si no hay hora de fin, sumamos 1 hora

  return { start, end };
}