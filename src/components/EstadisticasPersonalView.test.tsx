import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import type {
  CicloDto,
  PorEmpleadoDesgloseDto,
  PorEmpleadoDto,
} from '../types';
import { EstadisticasPersonalView } from './EstadisticasPersonalView';

vi.mock('../api/client');
vi.mock('recharts', () => {
  const stub = (name: string) => {
    const C = ({ children, data, dataKey }: any) => (
      <div
        data-testid={`recharts-${name}`}
        data-key={dataKey}
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

const SESSION = {
  accessToken: 't',
  email: 'jefa@una.cr',
  role: 'jefa' as const,
  campus: 'nicoya' as const,
  campusId: 1,
  name: 'Jefa',
  userId: 'u-jefa',
};

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

// Orden descendente por atenciones, como lo devuelve el backend.
const RANKING: PorEmpleadoDto[] = [
  {
    usuarioId: 'u-ana',
    nombreCompleto: 'Ana Picado',
    activo: true,
    atenciones: 19,
    personas: 4,
    tiempo: 90,
    registros: 19,
    eventos: 1,
  },
  {
    usuarioId: 'u-claudia',
    nombreCompleto: 'Claudia Vargas',
    activo: false,
    atenciones: 5,
    personas: 0,
    tiempo: 0,
    registros: 5,
    eventos: 0,
  },
  {
    usuarioId: 'u-beatriz',
    nombreCompleto: 'Beatriz Rojas',
    activo: true,
    atenciones: 0,
    personas: 0,
    tiempo: 0,
    registros: 0,
    eventos: 0,
  },
];

const DESGLOSE: PorEmpleadoDesgloseDto = {
  filas: [
    {
      usuarioId: 'u-ana',
      nombreCompleto: 'Ana Picado',
      categoriaId: 7,
      categoriaNombre: 'Computadoras',
      categoriaPadreNombre: '',
      moduloNombre: 'Circulación',
      total: 19,
      totalPersonas: 0,
      totalTiempo: 0,
      origen: 'atencion',
    },
    {
      usuarioId: 'u-ana',
      nombreCompleto: 'Ana Picado',
      categoriaId: 8,
      categoriaNombre: 'Taller de APA',
      categoriaPadreNombre: '',
      moduloNombre: 'Desarrollo Personal',
      total: 1,
      totalPersonas: 4,
      totalTiempo: 90,
      origen: 'capacitacion',
    },
  ],
  subtotales: [
    {
      moduloNombre: 'Circulación',
      total: 19,
      totalPersonas: 0,
      totalTiempo: 0,
    },
    {
      moduloNombre: 'Desarrollo Personal',
      total: 1,
      totalPersonas: 4,
      totalTiempo: 90,
    },
  ],
  totalGeneral: { total: 20, totalPersonas: 4, totalTiempo: 90 },
};

function mockCargaBase() {
  mockedApi.ciclos.mockResolvedValue(CICLOS);
  mockedApi.cicloActual.mockResolvedValue(CICLOS[0] as CicloDto);
  mockedApi.modulos.mockResolvedValue([
    { id: 7, nombre: 'Circulación' },
    { id: 9, nombre: 'Desarrollo Personal' },
  ]);
  mockedApi.categorias.mockResolvedValue([
    {
      id: 5,
      moduloId: 7,
      nombre: 'Computadoras',
      tipoMetrica: 'simple',
      activo: true,
      creadoPor: null,
      categoriaPadreId: null,
    },
  ]);
  mockedApi.porEmpleado.mockResolvedValue(RANKING);
  mockedApi.porEmpleadoDesglose.mockResolvedValue(DESGLOSE);
}

describe('EstadisticasPersonalView (toggle, tarjetas, filtros y estados)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCargaBase();
  });

  it('muestra el encabezado con el campus activo de la sesión', async () => {
    render(<EstadisticasPersonalView session={SESSION} />);

    expect(
      await screen.findByRole('heading', { name: /Personal del Campus Nicoya/i }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(mockedApi.porEmpleado).toHaveBeenCalledWith(
        expect.objectContaining({ sedeId: 1 }),
        expect.anything(),
      ),
    );
  });

  it('el modo General muestra el ranking con totales y fila TOTAL verificable', async () => {
    render(<EstadisticasPersonalView session={SESSION} />);

    const filas = await screen.findAllByTestId('fila-ranking');
    // Orden descendente por atenciones: Ana (19), Claudia (5), Beatriz (0).
    expect(filas).toHaveLength(3);
    expect(within(filas[0]).getByText('Ana Picado')).toBeInTheDocument();
    expect(within(filas[1]).getByText('Claudia Vargas')).toBeInTheDocument();
    // La empleada sin registros sigue visible, en cero.
    expect(within(filas[2]).getByText('Beatriz Rojas')).toBeInTheDocument();
    expect(within(filas[2]).getAllByText('0').length).toBeGreaterThan(0);

    // Inactiva con marca.
    expect(within(filas[1]).getByText('Inactiva')).toBeInTheDocument();

    // Fila TOTAL = suma de la columna (19 + 5 + 0 = 24).
    const pie = screen.getByText('TOTAL').closest('tr')!;
    expect(within(pie).getByText('24')).toBeInTheDocument();
  });

  it('el toggle cambia a Personal específico y selecciona la primera empleada', async () => {
    const user = userEvent.setup();
    render(<EstadisticasPersonalView session={SESSION} />);

    await screen.findByTestId('panel-ranking');
    await user.click(screen.getByTestId('toggle-personal'));

    expect(await screen.findByTestId('tarjetas-personal')).toBeInTheDocument();
    expect(screen.getByTestId('toggle-personal')).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // Selección por defecto: la primera del ranking.
    await waitFor(() =>
      expect(mockedApi.porEmpleadoDesglose).toHaveBeenCalledWith(
        expect.objectContaining({ usuarioId: 'u-ana' }),
        expect.anything(),
      ),
    );
    expect(await screen.findByTestId('panel-desglose')).toBeInTheDocument();
  });

  it('la selección persiste al volver a General y queda marcada en el ranking', async () => {
    const user = userEvent.setup();
    render(<EstadisticasPersonalView session={SESSION} />);

    await screen.findByTestId('panel-ranking');
    await user.click(screen.getByTestId('toggle-personal'));

    const tarjetas = await screen.findAllByTestId('tarjeta-empleada');
    await user.click(tarjetas[1]); // Claudia
    await waitFor(() =>
      expect(mockedApi.porEmpleadoDesglose).toHaveBeenCalledWith(
        expect.objectContaining({ usuarioId: 'u-claudia' }),
        expect.anything(),
      ),
    );

    await user.click(screen.getByTestId('toggle-general'));
    const marcadas = screen
      .getAllByTestId('fila-ranking')
      .filter((fila) => fila.getAttribute('aria-selected') === 'true');
    expect(marcadas).toHaveLength(1);
    expect(within(marcadas[0]).getByText('Claudia Vargas')).toBeInTheDocument();
    expect(within(marcadas[0]).getByText('Seleccionada')).toBeInTheDocument();

    // Al regresar, la misma empleada sigue seleccionada.
    await user.click(screen.getByTestId('toggle-personal'));
    const seleccionadas = screen
      .getAllByTestId('tarjeta-empleada')
      .filter((t) => t.getAttribute('aria-pressed') === 'true');
    expect(seleccionadas).toHaveLength(1);
    expect(
      within(seleccionadas[0]).getByText('Claudia Vargas'),
    ).toBeInTheDocument();
  });

  it('en Personal específico la seleccionada se resalta y las demás quedan atenuadas', async () => {
    const user = userEvent.setup();
    render(<EstadisticasPersonalView session={SESSION} />);

    await screen.findByTestId('panel-ranking');
    await user.click(screen.getByTestId('toggle-personal'));

    const tarjetas = await screen.findAllByTestId('tarjeta-empleada');
    expect(tarjetas[0]).toHaveAttribute('aria-pressed', 'true');
    expect(tarjetas[0].className).toContain('ring-[#990000]');
    expect(tarjetas[1].className).toContain('opacity-60');
    expect(tarjetas[1]).toHaveAttribute('aria-pressed', 'false');
  });

  it('el desglose muestra filas, subtotales por módulo y total general', async () => {
    const user = userEvent.setup();
    render(<EstadisticasPersonalView session={SESSION} />);

    await screen.findByTestId('panel-ranking');
    await user.click(screen.getByTestId('toggle-personal'));

    const panel = await screen.findByTestId('panel-desglose');
    await waitFor(() => {
      expect(within(panel).getAllByTestId('fila-desglose')).toHaveLength(2);
    });
    expect(within(panel).getByText('Taller de APA')).toBeInTheDocument();
    expect(
      within(panel).getByText('Capacitación asistida'),
    ).toBeInTheDocument();

    const subtotales = within(panel).getAllByTestId('fila-subtotal');
    expect(subtotales).toHaveLength(2);
    expect(
      within(subtotales[0]).getByText('Subtotal Circulación'),
    ).toBeInTheDocument();

    expect(within(panel).getByText('TOTAL GENERAL')).toBeInTheDocument();
    expect(within(panel).getByText('20')).toBeInTheDocument(); // total 19 + 1
  });

  it('el rango de fechas invertido bloquea la consulta con aviso', async () => {
    const user = userEvent.setup();
    render(<EstadisticasPersonalView session={SESSION} />);
    await screen.findByTestId('panel-ranking');

    await user.selectOptions(
      screen.getByLabelText('Período'),
      'rango',
    );
    fireEvent.change(screen.getByLabelText('Fecha inicial del rango'), {
      target: { value: '2026-07-01' },
    });
    // Última llamada válida (con el desde completo y sin hasta).
    const llamadasValidas = mockedApi.porEmpleado.mock.calls.length;

    fireEvent.change(screen.getByLabelText('Fecha final del rango'), {
      target: { value: '2026-03-01' },
    });

    expect(await screen.findByTestId('rango-invalido')).toBeInTheDocument();
    // El rango invertido no vuelve a consultar.
    expect(mockedApi.porEmpleado.mock.calls.length).toBe(llamadasValidas);
    const ultima = mockedApi.porEmpleado.mock.calls.at(-1)?.[0] as Record<string, unknown>;
    expect(ultima).not.toMatchObject({ hasta: '2026-03-01' });
  });

  it('el filtro de rango libre manda desde y hasta al backend', async () => {
    const user = userEvent.setup();
    render(<EstadisticasPersonalView session={SESSION} />);
    await screen.findByTestId('panel-ranking');

    await user.selectOptions(
      screen.getByLabelText('Período'),
      'rango',
    );
    fireEvent.change(screen.getByLabelText('Fecha inicial del rango'), {
      target: { value: '2026-03-01' },
    });
    fireEvent.change(screen.getByLabelText('Fecha final del rango'), {
      target: { value: '2026-07-31' },
    });

    await waitFor(() =>
      expect(mockedApi.porEmpleado).toHaveBeenCalledWith(
        expect.objectContaining({
          desde: '2026-03-01',
          hasta: '2026-07-31',
          sedeId: 1,
        }),
        expect.anything(),
      ),
    );
    expect(screen.queryByTestId('rango-invalido')).not.toBeInTheDocument();
  });

  it('muestra estado vacío cuando no hay personal con registros', async () => {
    mockedApi.porEmpleado.mockResolvedValue([]);
    render(<EstadisticasPersonalView session={SESSION} />);

    expect(await screen.findByTestId('ranking-vacio')).toBeInTheDocument();
    // La gráfica del ranking también informa que no hay datos.
    expect(await screen.findByTestId('grafico-ranking-vacio')).toBeInTheDocument();
  });

  it('muestra estado vacío del desglose cuando la empleada no tiene registros', async () => {
    mockedApi.porEmpleadoDesglose.mockResolvedValue({
      filas: [],
      subtotales: [],
      totalGeneral: { total: 0, totalPersonas: 0, totalTiempo: 0 },
    });
    const user = userEvent.setup();
    render(<EstadisticasPersonalView session={SESSION} />);

    await screen.findByTestId('panel-ranking');
    await user.click(screen.getByTestId('toggle-personal'));
    expect(await screen.findByTestId('desglose-vacio')).toBeInTheDocument();
    expect(
      await screen.findByTestId('grafico-desglose-vacio'),
    ).toBeInTheDocument();
  });

  it('la gráfica de barras del modo General muestra atenciones y personas por empleada', async () => {
    render(<EstadisticasPersonalView session={SESSION} />);

    await screen.findAllByTestId('fila-ranking');
    const seccion = await screen.findByTestId('grafico-ranking');
    const grafico = within(seccion).getByTestId('recharts-BarChart');
    const datos = JSON.parse(grafico.getAttribute('data-data') ?? '[]') as Array<
      Record<string, unknown>
    >;

    expect(datos).toHaveLength(3);
    expect(datos[0]).toEqual({
      nombre: 'Ana Picado',
      atenciones: 19,
      personas: 4,
    });
    expect(datos[2]).toEqual({
      nombre: 'Beatriz Rojas',
      atenciones: 0,
      personas: 0,
    });
    // Dos series: Atenciones (rojo UNA) y Personas (azul UNA).
    const barras = within(seccion).getAllByTestId('recharts-Bar');
    expect(barras).toHaveLength(2);
    expect(barras[0].getAttribute('data-key')).toBe('atenciones');
    expect(barras[1].getAttribute('data-key')).toBe('personas');
  });

  it('la gráfica de barras del Personal específico muestra las categorías de la empleada', async () => {
    const user = userEvent.setup();
    render(<EstadisticasPersonalView session={SESSION} />);

    await screen.findAllByTestId('fila-ranking');
    await user.click(screen.getByTestId('toggle-personal'));

    const seccion = await screen.findByTestId('grafico-desglose');
    await waitFor(() => {
      expect(
        within(seccion).queryByTestId('recharts-BarChart'),
      ).not.toBeNull();
    });
    const grafico = within(seccion).getByTestId('recharts-BarChart');
    const datos = JSON.parse(grafico.getAttribute('data-data') ?? '[]') as Array<
      Record<string, unknown>
    >;

    // Una fila por categoría del desglose (Computadoras y Taller de APA).
    expect(datos).toHaveLength(2);
    expect(datos[0]).toEqual({
      nombre: 'Computadoras',
      atenciones: 19,
      personas: 0,
    });
    expect(datos[1]).toEqual({
      nombre: 'Taller de APA',
      atenciones: 1,
      personas: 4,
    });
  });

  it('muestra error cuando el ranking no se puede cargar', async () => {
    mockedApi.porEmpleado.mockRejectedValue(new Error('fallo'));
    render(<EstadisticasPersonalView session={SESSION} />);

    const panel = await screen.findByTestId('panel-ranking');
    await waitFor(() =>
      expect(
        within(panel).getByText(
          'No se pudieron cargar los datos del personal.',
        ),
      ).toBeInTheDocument(),
    );
    // La gráfica del ranking informa el mismo error.
    const grafico = await screen.findByTestId('grafico-ranking');
    expect(
      within(grafico).getByText('No se pudieron cargar los datos del personal.'),
    ).toBeInTheDocument();
  });
});
