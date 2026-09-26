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

/** La serie de barras puede representar eventos o personas capacitadas. */
export type MedidaComparativo = 'eventos' | 'personas';

const CLAVES_CICLO = ['iCiclo', 'iiCiclo'] as const;
const CLAVES_CAMPUS = ['nicoya', 'liberia'] as const;

const valorDe = (row: PorCategoriaDto | PorAnioDto, medida: MedidaComparativo) =>
  medida === 'personas' ? row.totalPersonas : row.total;

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
  medida: MedidaComparativo = 'eventos',
): ResultadoComparativo {
  const mapa = new Map<number, BarChartDataItem>();
  for (const { ciclo, rows } of rowsPorCiclo) {
    const clave: 'iCiclo' | 'iiCiclo' = ciclo.numero === 1 ? 'iCiclo' : 'iiCiclo';
    for (const row of rows) {
      const entry = mapa.get(row.categoriaId) ?? {
        categoria: row.categoriaNombre,
        iCiclo: 0,
        iiCiclo: 0,
      };
      entry[clave] = ((entry[clave] as number) ?? 0) + valorDe(row, medida);
      mapa.set(row.categoriaId, entry);
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
  medida: MedidaComparativo = 'eventos',
): ResultadoComparativo {
  const mapa = new Map<number, BarChartDataItem>();
  const acumular = (rows: PorCategoriaDto[], clave: 'nicoya' | 'liberia') => {
    for (const row of rows) {
      const entry = mapa.get(row.categoriaId) ?? {
        categoria: row.categoriaNombre,
        nicoya: 0,
        liberia: 0,
      };
       entry[clave] = ((entry[clave] as number) ?? 0) + valorDe(row, medida);
      mapa.set(row.categoriaId, entry);
    }
  };
  acumular(rowsNicoya, 'nicoya');
  acumular(rowsLiberia, 'liberia');
  const datos = Array.from(mapa.values()).sort(comparadorTotalDesc(CLAVES_CAMPUS));
  return { datos, totales: { nicoya: 0, liberia: 0, ...calcularTotales(datos, CLAVES_CAMPUS) } };
}

/**
 * Agrupa por año lectivo de todos los años presentes en los datos, keyed por
 * categoría (id) para no fusionar categorías homónimas.
 * `anios` (derivados de los ciclos) ordena los años del eje; los totales
 * se acumulan sobre los años realmente presentes en las filas, igual que el
 * comportamiento anterior: así el acumulado anual es completo aunque los
 * registros incluyan años sin ciclo configurado en el sistema.
 */
export function agruparPorAnio(
  rows: PorAnioDto[],
  anios: number[],
  medida: MedidaComparativo = 'eventos',
): ResultadoComparativo {
  const porCategoria = new Map<
    number,
    { categoria: string; porAnio: Record<string, number | undefined> }
  >();
  const totales: Record<string, number> = {};
  for (const row of rows) {
    const entrada = porCategoria.get(row.categoriaId) ?? {
      categoria: row.categoriaNombre,
      porAnio: {},
    };
    entrada.porAnio[String(row.anio)] =
      ((entrada.porAnio[String(row.anio)] as number) ?? 0) + valorDe(row, medida);
    porCategoria.set(row.categoriaId, entrada);
    totales[String(row.anio)] =
      (totales[String(row.anio)] ?? 0) + valorDe(row, medida);
  }
  const claves = anios.map(String);
  const datos = Array.from(porCategoria.values())
    .map(
      ({ categoria, porAnio }): BarChartDataItem => ({
        categoria,
        ...porAnio,
      }),
    )
    .sort(comparadorTotalDesc(claves));
  return { datos, totales };
}
