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

const fila = (nombre: string, total: number): PorCategoriaDto => ({
  categoriaId: 1,
  categoriaNombre: nombre,
  moduloNombre: 'Servicios',
  total,
  totalPersonas: 0,
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
});

describe('agruparPorAnio', () => {
  const filaAnio = (nombre: string, anio: number, total: number): PorAnioDto => ({
    categoriaNombre: nombre,
    moduloNombre: 'Servicios',
    anio,
    total,
    totalPersonas: 0,
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