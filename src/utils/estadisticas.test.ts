import { describe, expect, it } from 'vitest';
import type { CicloDto, PorAnioDto, PorCategoriaDto } from '../types';
import {
  agruparPorAnio,
  agruparPorCampus,
  agruparPorCiclo,
  calcularTotales,
} from './estadisticas';

const ciclo = (id: number, anio: number, numero: 1 | 2): CicloDto => ({
  id,
  anio,
  numero,
  fechaInicio: '2026-02-03',
  fechaFin: '2026-06-20',
});

// Id estable por nombre: el agrupador usa categoriaId (no el nombre) para no
// fusionar categorías homónimas de módulos distintos.
const IDS: Record<string, number> = {};
const idDe = (nombre: string): number => {
  if (!IDS[nombre]) IDS[nombre] = Object.keys(IDS).length + 1;
  return IDS[nombre];
};

const fila = (nombre: string, total: number): PorCategoriaDto => ({
  categoriaId: idDe(nombre),
  categoriaNombre: nombre,
  categoriaPadreNombre: '',
  moduloNombre: 'Servicios',
  total,
  totalPersonas: 0,
  totalTiempo: 0,
});

describe('agruparPorCiclo', () => {
  it('combina I y II ciclo de varios años por categoría y publica totales', () => {
    const rowsPorCiclo = [
      {
        ciclo: ciclo(1, 2025, 1),
        rows: [fila('Consultas en sala', 10), fila('Préstamos', 5)],
      },
      {
        ciclo: ciclo(2, 2025, 2),
        rows: [fila('Consultas en sala', 3)],
      },
      {
        ciclo: ciclo(3, 2026, 1),
        rows: [fila('Consultas en sala', 7)],
      },
      {
        ciclo: ciclo(4, 2026, 2),
        rows: [fila('Préstamos', 8)],
      },
    ];

    const { datos, totales } = agruparPorCiclo(rowsPorCiclo);

    expect(datos).toEqual([
      { categoria: 'Consultas en sala', iCiclo: 17, iiCiclo: 3 },
      { categoria: 'Préstamos', iCiclo: 5, iiCiclo: 8 },
    ]);
    expect(totales).toEqual({ iCiclo: 22, iiCiclo: 11 });
  });

  it('no fusiona categorías homónimas con distinto id', () => {
    const a: PorCategoriaDto = {
      categoriaId: 100,
      categoriaNombre: 'RAI',
      categoriaPadreNombre: '',
      moduloNombre: 'Módulo X',
      total: 4,
      totalPersonas: 0,
      totalTiempo: 0,
    };
    const b: PorCategoriaDto = {
      categoriaId: 200,
      categoriaNombre: 'RAI',
      categoriaPadreNombre: '',
      moduloNombre: 'Módulo Y',
      total: 6,
      totalPersonas: 0,
      totalTiempo: 0,
    };

    const { datos } = agruparPorCiclo([{ ciclo: ciclo(1, 2026, 1), rows: [a, b] }]);

    expect(datos).toHaveLength(2);
    expect(datos.map((d) => d.iCiclo).sort()).toEqual([4, 6]);
  });

  it('ordena descendente por total combinado de ambas series', () => {
    const rowsPorCiclo = [
      { ciclo: ciclo(1, 2026, 1), rows: [fila('A', 2), fila('B', 50)] },
      { ciclo: ciclo(2, 2026, 2), rows: [fila('A', 100), fila('B', 1)] },
    ];

    const { datos } = agruparPorCiclo(rowsPorCiclo);

    expect(datos.map((d) => d.categoria)).toEqual(['A', 'B']);
  });

  it('con categorías vacías no genera filas ni totales', () => {
    const { datos, totales } = agruparPorCiclo([
      { ciclo: ciclo(1, 2026, 1), rows: [] },
      { ciclo: ciclo(2, 2026, 2), rows: [] },
    ]);

    expect(datos).toEqual([]);
    expect(totales).toEqual({ iCiclo: 0, iiCiclo: 0 });
  });

  it('puede comparar personas capacitadas en vez de eventos', () => {
    const capacitacion: PorCategoriaDto = {
      categoriaId: 90,
      categoriaNombre: 'Taller de IA',
      categoriaPadreNombre: '',
      moduloNombre: 'Desarrollo Personal',
      total: 1,
      totalPersonas: 2,
      totalTiempo: 120,
    };

    const { datos, totales } = agruparPorCiclo(
      [
        { ciclo: ciclo(10, 2026, 1), rows: [capacitacion] },
        {
          ciclo: ciclo(11, 2026, 2),
          rows: [{ ...capacitacion, totalPersonas: 3 }],
        },
      ],
      'personas',
    );

    expect(datos).toEqual([
      { categoria: 'Taller de IA', iCiclo: 2, iiCiclo: 3 },
    ]);
    expect(totales).toEqual({ iCiclo: 2, iiCiclo: 3 });
  });
});

describe('agruparPorCampus', () => {
  it('desglosa cada categoría en Nicoya y Liberia y publica totales', () => {
    const { datos, totales } = agruparPorCampus(
      [fila('Consultas en sala', 20), fila('Préstamos', 4)],
      [fila('Consultas en sala', 8)],
    );

    expect(datos).toEqual([
      { categoria: 'Consultas en sala', nicoya: 20, liberia: 8 },
      { categoria: 'Préstamos', nicoya: 4, liberia: 0 },
    ]);
    expect(totales).toEqual({ nicoya: 24, liberia: 8 });
  });

  it('compara personas capacitadas por campus', () => {
    const capacitacion: PorCategoriaDto = {
      categoriaId: 90,
      categoriaNombre: 'Taller de IA',
      categoriaPadreNombre: '',
      moduloNombre: 'Desarrollo Personal',
      total: 1,
      totalPersonas: 2,
      totalTiempo: 120,
    };
    const { datos, totales } = agruparPorCampus(
      [capacitacion],
      [{ ...capacitacion, totalPersonas: 3 }],
      'personas',
    );

    expect(datos).toEqual([
      { categoria: 'Taller de IA', nicoya: 2, liberia: 3 },
    ]);
    expect(totales).toEqual({ nicoya: 2, liberia: 3 });
  });
});

describe('agruparPorAnio', () => {
  const filaAnio = (nombre: string, anio: number, total: number): PorAnioDto => ({
    categoriaId: idDe(nombre),
    categoriaNombre: nombre,
    categoriaPadreNombre: '',
    moduloNombre: 'Servicios',
    anio,
    total,
    totalPersonas: 0,
    totalTiempo: 0,
  });

  it('agrupa por año y publica el total de todos los años presentes', () => {
    const { datos, totales } = agruparPorAnio(
      [
        filaAnio('Consultas', 2025, 10),
        filaAnio('Consultas', 2026, 32),
        filaAnio('Préstamos', 2025, 2),
        filaAnio('Préstamos', 2026, 3),
      ],
      [2026],
    );

    expect(datos).toEqual([
      { categoria: 'Consultas', '2025': 10, '2026': 32 },
      { categoria: 'Préstamos', '2025': 2, '2026': 3 },
    ]);
    // Total acumulado multianual: depende de los años presentes, no de los ciclos.
    expect(totales).toEqual({ '2025': 12, '2026': 35 });
  });

  it('ordena por la suma de los años configurados en el sistema', () => {
    const { datos } = agruparPorAnio(
      [
        filaAnio('A', 2025, 100),
        filaAnio('A', 2026, 1),
        filaAnio('B', 2025, 1),
        filaAnio('B', 2026, 50),
      ],
      [2025, 2026],
    );

    expect(datos.map((d) => d.categoria)).toEqual(['A', 'B']);
  });

  it('acumula personas capacitadas en el modo anual', () => {
    const capacitacion: PorAnioDto = {
      categoriaId: 90,
      categoriaNombre: 'Taller de IA',
      categoriaPadreNombre: '',
      moduloNombre: 'Desarrollo Personal',
      anio: 2026,
      total: 1,
      totalPersonas: 2,
      totalTiempo: 120,
    };
    const { datos, totales } = agruparPorAnio([capacitacion], [2026], 'personas');

    expect(datos).toEqual([{ categoria: 'Taller de IA', '2026': 2 }]);
    expect(totales).toEqual({ '2026': 2 });
  });
});

describe('calcularTotales', () => {
  it('suma cada serie independientemente ignorando claves ausentes', () => {
    const totales = calcularTotales(
      [
        { categoria: 'A', iCiclo: 3, nicoya: 1 },
        { categoria: 'B', iCiclo: 5, liberia: 9 },
      ],
      ['iCiclo', 'nicoya', 'liberia'],
    );

    expect(totales).toEqual({ iCiclo: 8, nicoya: 1, liberia: 9 });
  });
});
