import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import type {
  CategoriaDto,
  CicloDto,
  DatosReporteDto,
  ModuloDto,
  UserSession,
  UsuarioDto,
} from '../types';
import { ReportsView } from './ReportsView';

vi.mock('../api/client');

const mockedApi = vi.mocked(api);

const JEFA: UserSession = {
  accessToken: 't',
  email: 'jefa@una.cr',
  role: 'jefa',
  campus: 'nicoya',
  campusId: 1,
  name: 'Jefa',
  userId: 'u-jefa',
};

const BIBLIO: UserSession = {
  ...JEFA,
  role: 'bibliotecologa',
  email: 'biblio@una.cr',
  name: 'Biblio',
  userId: 'u-biblio',
};

const CICLOS: CicloDto[] = [
  { id: 10, anio: 2026, numero: 1, fechaInicio: '2026-02-03', fechaFin: '2026-06-20' },
  { id: 11, anio: 2026, numero: 2, fechaInicio: '2026-07-14', fechaFin: '2026-11-28' },
];

const MODULOS: ModuloDto[] = [
  { id: 1, nombre: 'Circulación' },
  { id: 9, nombre: 'Desarrollo Personal' },
];

const CATEGORIAS: CategoriaDto[] = [
  {
    id: 1,
    moduloId: 1,
    nombre: 'Atención de usuarios',
    tipoMetrica: 'simple',
    activo: true,
    creadoPor: null,
    categoriaPadreId: null,
  },
  {
    id: 2,
    moduloId: 1,
    nombre: 'Presencial',
    tipoMetrica: 'simple',
    activo: true,
    creadoPor: null,
    categoriaPadreId: 1,
  },
  {
    id: 3,
    moduloId: 9,
    nombre: 'Taller de APA',
    tipoMetrica: 'asistentes',
    activo: true,
    creadoPor: null,
    categoriaPadreId: null,
  },
];

const USUARIOS: UsuarioDto[] = [
  {
    id: 'u-jefa',
    nombreCompleto: 'Jefa Uno',
    email: 'jefa@una.cr',
    googleId: null,
    rol: 'jefa',
    sedeId: 1,
    activo: true,
  },
  {
    id: 'u-biblio-1',
    nombreCompleto: 'Bibliotecóloga Nicoya',
    email: 'b1@una.cr',
    googleId: null,
    rol: 'bibliotecologa',
    sedeId: 1,
    activo: true,
  },
  {
    id: 'u-biblio-2',
    nombreCompleto: 'Bibliotecóloga Liberia',
    email: 'b2@una.cr',
    googleId: null,
    rol: 'bibliotecologa',
    sedeId: 2,
    activo: false,
  },
];

function preview(titulo = 'Reporte Institucional de Atenciones'): DatosReporteDto {
  return {
    meta: {
      titulo,
      modo: 'institucional',
      campus: 'Ambos campus (Nicoya + Liberia)',
      periodo: 'I Ciclo 2026',
      filtros: ['Campus: Ambos campus', 'Período: I Ciclo 2026'],
      nota: 'El total institucional incluye toda la actividad.',
      generadoEl: 'Generado el 16/10/2026 (hora de Costa Rica)',
      conMembrete: true,
    },
    secciones: ['resumen', 'modulos', 'poa', 'capacitaciones', 'personal'],
    graficos: true,
    resumen: {
      cantidad: 12,
      personas: 4,
      minutos: 90,
      registros: 3,
      eventos: 1,
      porModulo: [
        {
          moduloId: 1,
          modulo: 'Circulación',
          cantidad: 12,
          personas: 4,
          minutos: 90,
          porcentaje: 100,
        },
      ],
    },
    modulos: [
      {
        moduloId: 1,
        modulo: 'Circulación',
        cantidad: 12,
        personas: 4,
        minutos: 90,
        filas: [
          {
            categoriaId: 2,
            categoria: 'Presencial',
            categoriaPadreId: 1,
            categoriaPadre: 'Atención de usuarios',
            moduloId: 1,
            modulo: 'Circulación',
            tipoMetrica: 'simple',
            tipo: 'Cantidad',
            cantidad: 12,
            personas: 4,
            minutos: 90,
            registros: 3,
          },
        ],
      },
    ],
    detallePoa: [],
    detalleCapacitaciones: [
      {
        capacitacion: 'Taller de APA',
        expositor: 'Ana Rodríguez',
        institucion: 'Biblioteca',
        fecha: '2026-03-15',
        duracionMinutos: 90,
        empleados: ['Bibliotecóloga Nicoya'],
        asistentes: 1,
      },
    ],
    personal: {
      titulo: 'Estadística por Empleado',
      modo: 'ranking',
      consolidado: true,
      ranking: [
        {
          empleado: 'Bibliotecóloga Nicoya',
          campus: 'Nicoya',
          atenciones: 12,
          personas: 4,
          minutos: 90,
          registros: 3,
          eventos: 1,
        },
      ],
      desglose: [
        {
          empleado: 'Bibliotecóloga Nicoya',
          campus: 'Nicoya',
          categoria: 'Presencial',
          categoriaPadre: 'Atención de usuarios',
          modulo: 'Circulación',
          tipo: 'Cantidad',
          cantidad: 12,
          personas: 4,
          minutos: 90,
        },
      ],
      totalesRanking: {
        atenciones: 12,
        personas: 4,
        minutos: 90,
        registros: 3,
        eventos: 1,
      },
      totalesDesglose: { cantidad: 12, personas: 4, minutos: 90 },
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:reporte'),
  });
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

  mockedApi.ciclos.mockResolvedValue(CICLOS);
  mockedApi.modulos.mockResolvedValue(MODULOS);
  mockedApi.categorias.mockResolvedValue(CATEGORIAS);
  mockedApi.usuarios.mockResolvedValue(USUARIOS);
  mockedApi.previsualizarReporte.mockResolvedValue(preview());
  mockedApi.exportarReporte.mockResolvedValue({
    contenido: new Blob(['x']),
    nombre: 'reporte-atenciones.xlsx',
  });
});

describe('ReportsView — acceso y filtros', () => {
  it('solo la jefa ve la vista y consulta la previsualización', async () => {
    const { unmount } = render(<ReportsView session={BIBLIO} />);
    expect(screen.queryByTestId('reportes-vista')).not.toBeInTheDocument();
    expect(mockedApi.previsualizarReporte).not.toHaveBeenCalled();
    unmount();

    render(<ReportsView session={JEFA} />);
    expect(await screen.findByTestId('reportes-preview')).toBeInTheDocument();
    expect(mockedApi.previsualizarReporte).toHaveBeenCalledWith(
      expect.objectContaining({
        cicloId: 10,
        moduloIds: [1, 9],
        secciones: ['resumen', 'modulos', 'poa', 'capacitaciones', 'personal'],
        graficos: true,
        membrete: true,
      }),
      expect.any(AbortSignal),
    );
  });

  it('valida el rango de fechas y deshabilita la descarga', async () => {
    const user = userEvent.setup();
    render(<ReportsView session={JEFA} />);
    await screen.findByTestId('reportes-preview');

    await user.selectOptions(screen.getByLabelText(/^Período/), 'rango');
    expect(await screen.findByTestId('reportes-validacion')).toHaveTextContent(
      'Indique la fecha desde y la fecha hasta',
    );
    expect(screen.getByRole('button', { name: 'Descargar PDF' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Descargar Excel' })).toBeDisabled();

    await user.type(screen.getByLabelText(/^Desde/), '2026-03-20');
    await user.type(screen.getByLabelText(/^Hasta/), '2026-03-10');
    expect(await screen.findByTestId('reportes-validacion')).toHaveTextContent(
      'no puede ser posterior',
    );
  });

  it('cambia de campus y limpia la empleada incompatible', async () => {
    const user = userEvent.setup();
    render(<ReportsView session={JEFA} />);
    await screen.findByTestId('reportes-preview');

    const empleada = screen.getByLabelText(/Empleada/);
    await user.selectOptions(empleada, 'u-biblio-2');
    expect(await screen.findByText(/Bibliotecóloga Liberia/)).toBeInTheDocument();

    await user.click(screen.getByRole('radio', { name: /Campus Nicoya/ }));
    await waitFor(() => {
      expect(screen.getByLabelText(/Empleada/)).toHaveValue('');
    });
    expect(mockedApi.previsualizarReporte).toHaveBeenLastCalledWith(
      expect.objectContaining({ sedeId: 1 }),
      expect.any(AbortSignal),
    );
  });

  it('filtra por categorías y envía solo las elegidas', async () => {
    const user = userEvent.setup();
    render(<ReportsView session={JEFA} />);
    await screen.findByTestId('reportes-preview');

    await user.click(screen.getByRole('checkbox', { name: 'Todas' }));
    await user.click(screen.getByRole('checkbox', { name: 'Presencial' }));

    await waitFor(() => {
      expect(mockedApi.previsualizarReporte).toHaveBeenLastCalledWith(
        expect.objectContaining({ categoriaIds: [2] }),
        expect.any(AbortSignal),
      );
    });
  });

  it('exige al menos una sección y desactiva gráficos sin resumen', async () => {
    const user = userEvent.setup();
    render(<ReportsView session={JEFA} />);
    await screen.findByTestId('reportes-preview');

    const resumen = screen.getByRole('checkbox', { name: /^Resumen/ });
    const graficos = screen.getByRole('checkbox', {
      name: /Incluir gráficos/,
    });
    await user.click(resumen);
    expect(graficos).toBeDisabled();
    expect(graficos).not.toBeChecked();

    for (const seccion of [
      /^Detalle por módulos/,
      /^POA/,
      /^Desarrollo Profesional/,
      /^Personal/,
    ]) {
      await user.click(screen.getByRole('checkbox', { name: seccion }));
    }
    expect(await screen.findByTestId('reportes-validacion')).toHaveTextContent(
      'al menos una sección',
    );
  });
});

describe('ReportsView — descarga y respuestas fuera de orden', () => {
  it('descarga Excel con los filtros elegidos y evita doble envío', async () => {
    const user = userEvent.setup();
    let resolver!: (valor: { contenido: Blob; nombre: string }) => void;
    mockedApi.exportarReporte.mockReturnValueOnce(
      new Promise((resolve) => {
        resolver = resolve;
      }),
    );
    render(<ReportsView session={JEFA} />);
    await screen.findByTestId('reportes-preview');

    const boton = screen.getByRole('button', { name: 'Descargar Excel' });
    await user.click(boton);
    expect(
      screen.getByRole('button', { name: 'Generando Excel…' }),
    ).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Generando Excel…' }));
    expect(mockedApi.exportarReporte).toHaveBeenCalledTimes(1);
    expect(mockedApi.exportarReporte).toHaveBeenCalledWith(
      expect.objectContaining({ formato: 'excel', cicloId: 10 }),
    );

    await act(async () => {
      resolver({ contenido: new Blob(['x']), nombre: 'reporte.xlsx' });
    });
    expect(await screen.findByTestId('reportes-exito')).toHaveTextContent(
      'descargado correctamente',
    );
  });

  it('muestra el error de generación y permite reintentar', async () => {
    const user = userEvent.setup();
    mockedApi.exportarReporte.mockRejectedValueOnce(new Error('Chromium no disponible'));
    render(<ReportsView session={JEFA} />);
    await screen.findByTestId('reportes-preview');

    await user.click(screen.getByRole('button', { name: 'Descargar PDF' }));
    expect(await screen.findByTestId('reportes-error')).toHaveTextContent(
      'Chromium no disponible',
    );
    expect(screen.queryByTestId('reportes-exito')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Descargar PDF' }));
    await waitFor(() => {
      expect(mockedApi.exportarReporte).toHaveBeenCalledTimes(2);
    });
  });

  it('descarta una previsualización que llega tarde', async () => {
    const user = userEvent.setup();
    let resolverPrimera!: (datos: DatosReporteDto) => void;
    let resolverSegunda!: (datos: DatosReporteDto) => void;
    mockedApi.previsualizarReporte
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolverPrimera = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolverSegunda = resolve;
          }),
      );

    render(<ReportsView session={JEFA} />);
    await waitFor(() =>
      expect(mockedApi.previsualizarReporte).toHaveBeenCalledTimes(1),
    );

    await user.click(screen.getByRole('radio', { name: /Campus Liberia/ }));
    await waitFor(() =>
      expect(mockedApi.previsualizarReporte).toHaveBeenCalledTimes(2),
    );

    await act(async () => {
      resolverSegunda({
        ...preview('Reporte vigente'),
        meta: { ...preview().meta, titulo: 'Reporte vigente' },
      });
    });
    expect(await screen.findByText('Reporte vigente')).toBeInTheDocument();

    await act(async () => {
      resolverPrimera({
        ...preview('Reporte obsoleto'),
        meta: { ...preview().meta, titulo: 'Reporte obsoleto' },
      });
    });
    expect(screen.queryByText('Reporte obsoleto')).not.toBeInTheDocument();
    expect(screen.getByText('Reporte vigente')).toBeInTheDocument();
  });
});
