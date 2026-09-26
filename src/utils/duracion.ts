/**
 * Duración acumulada en minutos → `h:mm` (ej. 240 → "4:00").
 * Se usa donde el backend entrega minutos y la UI muestra horas:minutos.
 */
export function formatearDuracion(minutos: number): string {
  const total = Math.max(0, Math.round(minutos));
  const horas = Math.floor(total / 60);
  const min = total % 60;
  return `${horas}:${String(min).padStart(2, '0')}`;
}

/**
 * `1:30` → 90, `90` → 90. Devuelve `NaN` si no es un tiempo válido, para que
 * la validación de la UI pueda detectarlo antes de mandar el pedido.
 */
export function normalizarTiempoAMinutos(valor: string): number {
  const limpio = valor.trim();
  if (!limpio) return NaN;

  const hhmm = /^(\d{1,3}):([0-5]\d)$/.exec(limpio);
  if (hhmm) return Number(hhmm[1]) * 60 + Number(hhmm[2]);

  if (/^\d+$/.test(limpio)) return Number(limpio);
  return NaN;
}
