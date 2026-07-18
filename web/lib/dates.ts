export const RETENTION_DAYS = 30;

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function isWithinRetentionWindow(dateStr: string, today: Date): boolean {
  const d = new Date(`${dateStr}T00:00:00Z`);
  const start = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  const diffDays = Math.floor((start - d.getTime()) / 86_400_000);
  return diffDays >= 0 && diffDays < RETENTION_DAYS;
}
