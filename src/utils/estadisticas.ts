import type { CicloDto, PorAnioDto, PorCategoriaDto } from '../types';

export interface BarChartDataItem {
  categoria: string;
  iCiclo?: number;
  iiCiclo?: number;
  nicoya?: number;
  liberia?: number;
  [anio: string]: number | string | undefined;
}

export interface ResultadoComparativo {
  datos: BarChartDataItem[];
  totales: Record<string, number>;
}

const CLAVES_CICLO = ['iCiclo', 'iiCiclo'] as const;
const CLAVES_CAMPUS = ['nicoya', 'liberia'] as const;

/**
 * Suma cada serie (clave) a lo largo de todas las filas del comparativo.
 * Se usa para publicar la línea de totales verificable junto al gráfico.
 */
export function calcularTotales(
  datos: BarChartDataItem[],
  claves: readonly string[],
): Record<string, number> {
  const totales: Record<string, number> = {};
  for (const item of datos) {
    for (const clave of claves) {
      totales[clave] = (totales[clave] ?? 0) + ((item[clave] as number) ?? 0);
    }
  }
  return totales;
}

function comparadorTotalDesc(claves: readonly string[]) {
  const suma = (item: BarChartDataItem) =>
    claves.reduce((acc, clave) => acc + ((item[clave] as number) ?? 0), 0);
  return (a: BarChartDataItem, b: BarChartDataItem): number => suma(b) - suma(a);
}

/**
 * Agrupa por número de ciclo (I / II) sumando todos los años lectivos.
 * Entrada: los resultados de por-categoria para cada ciclo consultado.
 */
export function agruparPorCiclo(
  rowsPorCiclo: { ciclo: CicloDto; rows: PorCategoriaDto[] }[],
): ResultadoComparativo {
  const mapa = new Map<string, BarChartDataItem>();
  for (const { ciclo, rows } of rowsPorCiclo) {
    const clave: 'iCiclo' | 'iiCiclo' = ciclo.numero === 1 ? 'iCiclo' : 'iiCiclo';
    for (const row of rows) {
      const entry = mapa.get(row.categoriaNombre) ?? {
        categoria: row.categoriaNombre,
        iCiclo: 0,
        iiCiclo: 0,
      };
      entry[clave] = ((entry[clave] as number) ?? 0) + row.total;
      mapa.set(row.categoriaNombre, entry);
    }
  }
  const datos = Array.from(mapa.values()).sort(comparadorTotalDesc(CLAVES_CICLO));
  return { datos, totales: { iCiclo: 0, iiCiclo: 0, ...calcularTotales(datos, CLAVES_CICLO) } };
}

/**
 * Desglosa cada categoría en Nicoya (campus 1) y Liberia (campus 2).
 */
export function agruparPorCampus(
  rowsNicoya: PorCategoriaDto[],
  rowsLiberia: PorCategoriaDto[],
): ResultadoComparativo {
  const mapa = new Map<string, BarChartDataItem>();
  const acumular = (rows: PorCategoriaDto[], clave: 'nicoya' | 'liberia') => {
    for (const row of rows) {
      const entry = mapa.get(row.categoriaNombre) ?? {
        categoria: row.categoriaNombre,
        nicoya: 0,
        liberia: 0,
      };
      entry[clave] = ((entry[clave] as number) ?? 0) + row.total;
      mapa.set(row.categoriaNombre, entry);
    }
  };
  acumular(rowsNicoya, 'nicoya');
  acumular(rowsLiberia, 'liberia');
  const datos = Array.from(mapa.values()).sort(comparadorTotalDesc(CLAVES_CAMPUS));
  return { datos, totales: { nicoya: 0, liberia: 0, ...calcularTotales(datos, CLAVES_CAMPUS) } };
}

/**
 * Agrupa por año lectivo de todos los años presentes en los datos.
 * `anios` (derivados de los ciclos) ordena los años del eje; los totales
 * se acumulan sobre los años realmente presentes en las filas, igual que el
 * comportamiento anterior: así el acumulado anual es completo aunque los
 * registros incluyan años sin ciclo configurado en el sistema.
 */
export function agruparPorAnio(
  rows: PorAnioDto[],
  anios: number[],
): ResultadoComparativo {
  const totalesPorAnio = new Map<string, Record<string, number | undefined>>();
  const totales: Record<string, number> = {};
  for (const row of rows) {
    const entrada = totalesPorAnio.get(row.categoriaNombre) ?? {};
    entrada[String(row.anio)] = ((entrada[String(row.anio)] as number) ?? 0) + row.total;
    totalesPorAnio.set(row.categoriaNombre, entrada);
    totales[String(row.anio)] = (totales[String(row.anio)] ?? 0) + row.total;
  }
  const claves = anios.map(String);
  const datos = Array.from(totalesPorAnio.entries())
    .map(
      ([categoria, porAnio]): BarChartDataItem => ({
        categoria,
        ...porAnio,
      }),
    )
    .sort(comparadorTotalDesc(claves));
  return { datos, totales };
}