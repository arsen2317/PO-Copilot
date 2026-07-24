// ─── Formatters (unit-economics) ─────────────────────────────────────────────

export const fmt = (n: number, decimals = 0) =>
  n.toLocaleString('ru', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

export const fmtRub = (n: number) => `${fmt(Math.round(n))} ₽`;
export const fmtPct = (n: number) => `${fmt(n, 1)}%`;
