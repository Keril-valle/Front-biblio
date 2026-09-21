import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import type { CicloDto } from '../types';
import { DashboardCharts } from './DashboardCharts';

vi.mock('../api/client');
vi.mock('recharts', () => {
  const stub = (name: string) => {
    const C = ({ children, data }: any) => (
      <div
        data-testid={`recharts-${name}`}
        data-data={data ? JSON.stringify(data) : undefined}
      >
        {children}
      </div>
    );
    C.displayName = name;
    return C;
  };
  return {
    BarChart: stub('BarChart'),
    Bar: stub('Bar'),
    XAxis: stub('XAxis'),
    YAxis: stub('YAxis'),
    CartesianGrid: stub('CartesianGrid'),
    Tooltip: stub('Tooltip'),
    Legend: stub('Legend'),
    ResponsiveContainer: ({ children }: any) => (
      <div data-testid="recharts-ResponsiveContainer">{children}</div>
    ),
    PieChart: stub('PieChart'),
    Pie: stub('Pie'),
    Cell: stub('Cell'),
  };
});

vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
);

const mockedApi = vi.mocked(api);

const CICLOS: CicloDto[] = [
  {
    id: 10,
    anio: 2026,
    numero: 1,
    fechaInicio: '2026-02-03',
    fechaFin: '2026-06-20',
  },
  {
    id: 11,
    anio: 2026,
    numero: 2,
    fechaInicio: '2026-07-14',
    fechaFin: '2026-11-28',
  },
];

function mockCargaBase() {
  mockedApi.ciclos.mockResolvedValue(CICLOS);
  mockedApi.cicloActual.mockResolvedValue(CICLOS[0] as CicloDto);
  mockedApi.modulos.mockResolvedValue([{ id: 1, nombre: 'Servicios' }]);
  mockedApi.categorias.mockResolvedValue([
    {
      id: 5,
      moduloId: 1,
      nombre: 'Consultas en sala',
      tipoMetrica: 'simple',
      activo: true,
      creadoPor: null,
      categoriaPadreId: null,
      modulo: { id: 1, nombre: 'Servicios' },
    },
  ]);
  mockedApi.kpis.mockResolvedValue({
    totalAtenciones: 42,
    totalPersonas: 7,
    totalTiempo: 0,
  });
  mockedApi.composicion.mockResolvedValue([
    { categoriaId: 5, nombre: 'Consultas en sala', valor: 42 },
  ]);
  mockedApi.porCategoria.mockImplementation((cicloId?: number) =>
    Promise.resolve([
      {
        categoriaId: 5,
        categoriaNombre: 'Consultas en sala',
        categoriaPadreNombre: '',
        moduloNombre: 'Servicios',
        total: cicloId === 10 ? 30 : 12,
        totalPersonas: 0,
        totalTiempo: 0,
      },
    ]),
  );
  mockedApi.porAnio.mockResolvedValue([]);
  mockedApi.comparativoSedes.mockResolvedValue([]);
}

describe('DashboardCharts (filtros, textos y datos de gráficos)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCargaBase();
  });

  it('muestra KPIs y desglose con los datos de la api', async () => {
    render(<DashboardCharts role="jefa" />);

    expect(await screen.findByText('Atenciones del Ciclo')).toBeInTheDocument();
    expect((await screen.findAllByText('42')).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Personas Atendidas')).toBeInTheDocument();
    expect(
      await screen.findByText('Desglose por Categoría'),
    ).toBeInTheDocument();
  });

  it('el gráfico de barras combina I y II ciclo por categoría', async () => {
    render(<DashboardCharts role="jefa" />);

    const chart = await screen.findByTestId('recharts-BarChart');
    await waitFor(() => {
      const data = JSON.parse(chart.getAttribute('data-data') ?? '[]');
      expect(data).toEqual([
        { categoria: 'Consultas en sala', iCiclo: 30, iiCiclo: 12 },
      ]);
    });
  });

  it('por defecto muestra el ciclo vigente (no el primero)', async () => {
    mockedApi.cicloActual.mockResolvedValue(CICLOS[1] as CicloDto);
    render(<DashboardCharts role="jefa" />);
    await screen.findByText('Atenciones del Ciclo');

    await waitFor(() => {
      expect(mockedApi.kpis).toHaveBeenCalledWith(
        11,
        undefined,
        undefined,
        expect.any(AbortSignal),
        'categoria',
        undefined,
      );
    });
  });

  it('cambiar el ciclo actualiza los datos (kpis con el ciclo nuevo)', async () => {
    const user = userEvent.setup();
    render(<DashboardCharts role="jefa" />);
    await screen.findByText('Atenciones del Ciclo');

    const combos = screen.getAllByRole('combobox');
    await user.selectOptions(combos[0] as HTMLSelectElement, '11');

    await waitFor(() => {
      expect(mockedApi.kpis).toHaveBeenCalledWith(
        11,
        undefined,
        undefined,
        expect.any(AbortSignal),
        'categoria',
        undefined,
      );
    });
  });

  it('filtrar por campus muestra el campus y pide datos de esa sede', async () => {
    const user = userEvent.setup();
    render(<DashboardCharts role="jefa" />);
    await screen.findByText('Atenciones del Ciclo');

    expect(
      screen.getByText('Subsistema de Bibliotecas Chorotega'),
    ).toBeInTheDocument();

    const combos = screen.getAllByRole('combobox');
    await user.selectOptions(combos[4] as HTMLSelectElement, '2');

    expect(
      await screen.findByText('Campus Liberia — Biblioteca Rose Marie Ruiz Bravo'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(mockedApi.kpis).toHaveBeenCalledWith(
        expect.any(Number),
        2,
        undefined,
        expect.any(AbortSignal),
        'categoria',
        undefined,
      );
    });
  });

  it('filtrar por módulo incluye el módulo en los kpis', async () => {
    const user = userEvent.setup();
    render(<DashboardCharts role="jefa" />);
    await screen.findByText('Atenciones del Ciclo');

    const combos = screen.getAllByRole('combobox');
    await user.selectOptions(combos[1] as HTMLSelectElement, '1');

    await waitFor(() => {
      expect(mockedApi.kpis).toHaveBeenCalledWith(
        expect.any(Number),
        undefined,
        1,
        expect.any(AbortSignal),
        'categoria',
        undefined,
      );
    });
  });

  it('modo campus compara Nicoya vs Liberia por categoría', async () => {
    const user = userEvent.setup();
    mockedApi.porCategoria.mockImplementation(
      (_cicloId?: number, _moduloId?: number, sedeId?: number) => {
        if (sedeId === 1)
          return Promise.resolve([
            {
              categoriaId: 5,
              categoriaNombre: 'Consultas en sala',
              moduloNombre: 'Servicios',
              total: 20,
              totalPersonas: 0,
            },
          ]);
        if (sedeId === 2)
          return Promise.resolve([
            {
              categoriaId: 5,
              categoriaNombre: 'Consultas en sala',
              moduloNombre: 'Servicios',
              total: 8,
              totalPersonas: 0,
            },
          ]);
        return Promise.resolve([]);
      },
    );
    render(<DashboardCharts role="jefa" />);
    await screen.findByText('Atenciones del Ciclo');

    await user.click(screen.getByRole('button', { name: 'Campus' }));

    const chart = await screen.findByTestId('recharts-BarChart');
    await waitFor(() => {
      const data = JSON.parse(chart.getAttribute('data-data') ?? '[]');
      expect(data).toEqual([
        { categoria: 'Consultas en sala', nicoya: 20, liberia: 8 },
      ]);
    });
    expect(await screen.findByText(/Nicoya: 20 · Liberia: 8/)).toBeInTheDocument();
  });

  it('botón Campus solo visible con Ambos campus; al filtrar un campus vuelve a I/II Ciclo', async () => {
    const user = userEvent.setup();
    mockedApi.porCategoria.mockImplementation(
      (_cicloId?: number, _moduloId?: number, sedeId?: number) => {
        if (sedeId === 1)
          return Promise.resolve([
            {
              categoriaId: 5,
              categoriaNombre: 'Consultas en sala',
              moduloNombre: 'Servicios',
              total: 20,
              totalPersonas: 0,
            },
          ]);
        if (sedeId === 2)
          return Promise.resolve([
            {
              categoriaId: 5,
              categoriaNombre: 'Consultas en sala',
              moduloNombre: 'Servicios',
              total: 8,
              totalPersonas: 0,
            },
          ]);
        return Promise.resolve([]);
      },
    );
    render(<DashboardCharts role="jefa" />);
    await screen.findByText('Atenciones del Ciclo');

    // Con Ambos campus el botón existe; entro al modo campus.
    await user.click(screen.getByRole('button', { name: 'Campus' }));
    await screen.findByText(/Nicoya: 20 · Liberia: 8/);

    // Al filtrar un solo campus el botón desaparece y cae a I/II Ciclo.
    const combos = screen.getAllByRole('combobox');
    await user.selectOptions(combos[4] as HTMLSelectElement, '2');

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Campus' })).not.toBeInTheDocument();
    });
    const chart = await screen.findByTestId('recharts-BarChart');
    await waitFor(() => {
      const data = JSON.parse(chart.getAttribute('data-data') ?? '[]');
      expect(data).toEqual([{ categoria: 'Consultas en sala', iCiclo: 8, iiCiclo: 8 }]);
    });
    expect(await screen.findByText(/I Ciclo: 8 · II Ciclo: 8/)).toBeInTheDocument();
  });

  it('en modo anual el Total del Módulo muestra el acumulado de todos los años', async () => {
    const user = userEvent.setup();
    mockedApi.composicion.mockResolvedValue([
      { categoriaId: 5, nombre: 'Consultas en sala', valor: 7 },
    ]);
    mockedApi.porAnio.mockResolvedValue([
      {
        categoriaId: 5,
        categoriaNombre: 'Consultas en sala',
        categoriaPadreNombre: '',
        moduloNombre: 'Servicios',
        anio: 2025,
        total: 10,
        totalPersonas: 0,
        totalTiempo: 0,
      },
      {
        categoriaId: 5,
        categoriaNombre: 'Consultas en sala',
        categoriaPadreNombre: '',
        moduloNombre: 'Servicios',
        anio: 2026,
        total: 32,
        totalPersonas: 0,
        totalTiempo: 0,
      },
    ]);
    render(<DashboardCharts role="jefa" />);
    await screen.findByText('Atenciones del Ciclo');

    // Selecciono módulo para que aparezca el panel "Total del Módulo".
    const combos = screen.getAllByRole('combobox');
    await user.selectOptions(combos[1] as HTMLSelectElement, '1');

    // Antes del modo anual: total del ciclo seleccionado.
    expect(
      await screen.findByText('atenciones del módulo en el ciclo seleccionado'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Anual' }));

    // En modo anual: acumulado de todos los años (10 + 32).
    expect(
      await screen.findByText('atenciones del módulo en todos los años'),
    ).toBeInTheDocument();
    const panel = await screen.findByText('Total del Módulo');
    const section = panel.closest('section');
    expect(within(section!).getByText('42')).toBeInTheDocument();
  });

  it('ningún texto visible dice "sede"', async () => {
    const { container } = render(<DashboardCharts role="jefa" />);
    await screen.findByText('Atenciones del Ciclo');

    const matches = within(container).queryAllByText(/sede/i);
    expect(matches).toHaveLength(0);
  });

  it('bibliotecóloga: sin filtro ni modo campus; modos ciclos y anual intactos', async () => {
    const user = userEvent.setup();
    render(<DashboardCharts role="bibliotecologa" />);
    await screen.findByText('Atenciones del Ciclo');

    const combos = screen.getAllByRole('combobox');
    expect(combos).toHaveLength(4); // ciclo + módulo + nivel + categoría, sin campus
    expect(screen.queryByRole('button', { name: 'Campus' })).not.toBeInTheDocument();

    const chart = await screen.findByTestId('recharts-BarChart');
    await waitFor(() => {
      const data = JSON.parse(chart.getAttribute('data-data') ?? '[]');
      expect(data).toEqual([
        { categoria: 'Consultas en sala', iCiclo: 30, iiCiclo: 12 },
      ]);
    });
    expect(await screen.findByText(/I Ciclo: 30 · II Ciclo: 12/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Anual' }));
    expect(
      await screen.findByText('Todos los módulos: comparativa por año lectivo'),
    ).toBeInTheDocument();
  });

  it('descarta respuestas obsoletas al cambiar de ciclo rápidamente', async () => {
    const user = userEvent.setup();
    let resolvePrimero: (v: {
      totalAtenciones: number;
      totalPersonas: number;
      totalTiempo: number;
    }) => void = () => {};
    const primero = new Promise<{
      totalAtenciones: number;
      totalPersonas: number;
      totalTiempo: number;
    }>((res) => {
      resolvePrimero = res;
    });
    let resolveCompPrimera: (v: { categoriaId: number; nombre: string; valor: number }[]) => void =
      () => {};
    const compPrimera = new Promise<
      { categoriaId: number; nombre: string; valor: number }[]
    >((res) => {
      resolveCompPrimera = res;
    });

    mockedApi.kpis.mockImplementation((cicloId?: number) => {
      if (cicloId === 10) return primero;
      return Promise.resolve({
        totalAtenciones: 999,
        totalPersonas: 3,
        totalTiempo: 0,
      });
    });
    mockedApi.composicion.mockImplementation((cicloId?: number) => {
      if (cicloId === 10) return compPrimera;
      return Promise.resolve([{ categoriaId: 6, nombre: 'Categoría nueva', valor: 5 }]);
    });

    render(<DashboardCharts role="jefa" />);
    // Ciclo 10 (deferido) queda en vuelo mientras se filtra por ciclo.
    expect(await screen.findByText('II Ciclo 2026')).toBeInTheDocument();
    expect(screen.getByTestId('skeleton-kpis')).toBeInTheDocument();

    const combos = screen.getAllByRole('combobox');
    await user.selectOptions(combos[0] as HTMLSelectElement, '11');

    // La respuesta del ciclo 11 (nueva) pinta el total.
    expect(await screen.findByText('999')).toBeInTheDocument();

    // La respuesta obsoleta del ciclo 10 no debe sobrescribir la vista.
    resolvePrimero({ totalAtenciones: 1, totalPersonas: 1, totalTiempo: 0 });
    resolveCompPrimera([{ categoriaId: 6, nombre: 'Categoría nueva', valor: 1 }]);
    await waitFor(() => {
      expect(screen.queryByText('1')).not.toBeInTheDocument();
    });
    expect(screen.getByText('999')).toBeInTheDocument();
  });

  it('durante la carga muestra esqueletos en vez de totales parciales', async () => {
    let resolveKpis: (v: {
      totalAtenciones: number;
      totalPersonas: number;
      totalTiempo: number;
    }) => void = () => {};
    const kpisPendiente = new Promise<{
      totalAtenciones: number;
      totalPersonas: number;
      totalTiempo: number;
    }>((res) => {
      resolveKpis = res;
    });
    let resolveComp: (v: { categoriaId: number; nombre: string; valor: number }[]) => void =
      () => {};
    const compPendiente = new Promise<
      { categoriaId: number; nombre: string; valor: number }[]
    >((res) => {
      resolveComp = res;
    });
    mockedApi.kpis.mockImplementation(() => kpisPendiente);
    mockedApi.composicion.mockImplementation(() => compPendiente);

    render(<DashboardCharts role="jefa" />);

    expect(screen.getByTestId('skeleton-kpis')).toBeInTheDocument();
    expect(screen.getByTestId('skeleton-composicion')).toBeInTheDocument();

    resolveKpis({ totalAtenciones: 7, totalPersonas: 2, totalTiempo: 0 });
    resolveComp([{ categoriaId: 1, nombre: 'Servicios', valor: 7 }]);

    expect((await screen.findAllByText('7')).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByTestId('skeleton-kpis')).not.toBeInTheDocument();
    expect(screen.queryByTestId('skeleton-composicion')).not.toBeInTheDocument();
  });

  it('sin datos muestra estado vacío y totales en cero', async () => {
    mockedApi.kpis.mockResolvedValue({
      totalAtenciones: 0,
      totalPersonas: 0,
      totalTiempo: 0,
    });
    mockedApi.composicion.mockResolvedValue([]);
    mockedApi.porCategoria.mockResolvedValue([]);

    render(<DashboardCharts role="jefa" />);

    expect(
      await screen.findByText('No hay datos suficientes para mostrar el comparativo.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Sin datos para mostrar.')).toBeInTheDocument();
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
  });

  it('un error en los KPIs no bloquea el comparativo ni la composición', async () => {
    mockedApi.kpis.mockRejectedValue(new Error('fallo de kpis'));

    render(<DashboardCharts role="jefa" />);

    expect(
      (await screen.findAllByText(/No se pudieron cargar los datos\./)).length,
    ).toBeGreaterThanOrEqual(1);
    expect(await screen.findByTestId('recharts-BarChart')).toBeInTheDocument();
    expect(await screen.findByText('Desglose por Categoría')).toBeInTheDocument();
    expect((await screen.findAllByText('42')).length).toBeGreaterThanOrEqual(1);
  });
});
