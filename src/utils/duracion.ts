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
