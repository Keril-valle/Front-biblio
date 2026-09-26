import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import type {
  CategoriaDto,
  CicloDto,
  ModuloDto,
  UserSession,
} from '../types';
import { QuickRegisterView } from './QuickRegisterView';

vi.mock('../api/client');

const mockedApi = vi.mocked(api);

const session: UserSession = {
  accessToken: 'tok',
  email: 'biblio.nicoya@una.cr',
  role: 'bibliotecologa',
  campus: 'nicoya',
  campusId: 1,
  name: 'Biblio Nicoya',
  userId: 'u-1',
};

const MODULOS: ModuloDto[] = [
  { id: 1, nombre: 'Servicios' },
  { id: 2, nombre: 'Préstamos' },
  { id: 8, nombre: 'POA' },
  { id: 9, nombre: 'Desarrollo Personal' },
];

const CATEGORIAS: CategoriaDto[] = [
  {
    id: 11,
    moduloId: 1,
    nombre: 'Consultas en sala',
    tipoMetrica: 'simple',
    activo: true,
    creadoPor: null,
    categoriaPadreId: null,
  },
  {
    id: 12,
    moduloId: 1,
    nombre: 'Taller de inducción',
    tipoMetrica: 'doble',
    activo: true,
    creadoPor: null,
    categoriaPadreId: null,
  },
  {
    id: 15,
    moduloId: 1,
    nombre: 'Computadoras',
    tipoMetrica: 'simple',
    activo: true,
    creadoPor: null,
    categoriaPadreId: null,
  },
  {
    id: 16,
    moduloId: 1,
    nombre: 'Préstamo en Campus',
    tipoMetrica: 'simple',
    activo: true,
    creadoPor: null,
    categoriaPadreId: 15,
  },
  {
    id: 17,
    moduloId: 1,
    nombre: 'Capacitaciones',
    tipoMetrica: 'triple',
    activo: true,
    creadoPor: null,
    categoriaPadreId: null,
  },
  {
    id: 30,
    moduloId: 8,
    nombre: 'Metas',
    tipoMetrica: 'metas',
    activo: true,
    creadoPor: null,
    categoriaPadreId: null,
    permisoCreacion: 'jefa',
  },
  {
    id: 31,
    moduloId: 8,
    nombre: 'Evidencia',
    tipoMetrica: 'evidencia',
    activo: true,
    creadoPor: null,
    categoriaPadreId: null,
  },
  {
    id: 40,
    moduloId: 9,
    nombre: 'Taller de APA',
    tipoMetrica: 'asistentes',
    activo: true,
    creadoPor: null,
    categoriaPadreId: null,
    expositor: 'Ana Rodríguez',
    institucion: 'Departamento de Biblioteca',
    duracionMinutos: 90,
    fechaEvento: '2026-03-15',
  },
];

const USUARIOS_BASICOS = [
  { id: 'u-1', nombreCompleto: 'Empleado Uno' },
  { id: 'u-2', nombreCompleto: 'Empleado Dos' },
];

const CICLOS: CicloDto[] = [
  {
    id: 7,
    anio: 2026,
    numero: 1,
    fechaInicio: '2026-02-03',
    fechaFin: '2026-06-20',
  },
];

function mockCargaInicial() {
  mockedApi.categorias.mockResolvedValue(CATEGORIAS);
  mockedApi.ciclos.mockResolvedValue(CICLOS);
  mockedApi.modulos.mockResolvedValue(MODULOS);
  mockedApi.cicloActual.mockResolvedValue(CICLOS[0] as CicloDto);
  mockedApi.registros.mockResolvedValue({
    data: [],
    total: 0,
    page: 1,
    limit: 20,
  });
  mockedApi.crearRegistro.mockResolvedValue({
    id: 'r-1',
    usuarioId: 'u-1',
    sedeId: 1,
    categoriaId: 11,
    cicloId: 7,
    cantidad: 3,
    cantidadSecundaria: null,
    cantidadTerciaria: null,
    fechaHora: '2026-03-01 10:00:00',
    observaciones: null,
  });
  mockedApi.usuariosBasicos.mockResolvedValue(USUARIOS_BASICOS);
  mockedApi.crearCategoria.mockResolvedValue({} as CategoriaDto);
  mockedApi.actualizarCategoria.mockResolvedValue({} as CategoriaDto);
}

describe('QuickRegisterView (registro de atenciones)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCargaInicial();
    // jsdom no implementa scrollIntoView (lo usa GestionCapacitaciones).
    Element.prototype.scrollIntoView = vi.fn();
  });

  it('muestra módulos y al elegir uno lista sus categorías', async () => {
    const user = userEvent.setup();
    render(<QuickRegisterView session={session} />);

    expect(await screen.findByText('Servicios')).toBeInTheDocument();
    await user.click(screen.getByText('Servicios'));

    expect(await screen.findByText('Consultas en sala')).toBeInTheDocument();
    expect(screen.getByText('Taller de inducción')).toBeInTheDocument();
  });

  it('seleccionar categoría y guardar dispara la api con los datos correctos', async () => {
    const user = userEvent.setup();
    render(<QuickRegisterView session={session} />);

    await user.click(await screen.findByText('Servicios'));
    await user.click(await screen.findByText('Consultas en sala'));
    await user.click(
      screen.getByRole('button', { name: '+ Guardar Registro de Atención' }),
    );

    await waitFor(() => {
      expect(mockedApi.crearRegistro).toHaveBeenCalledWith({
        categoriaId: 11,
        cicloId: 7,
        cantidad: 1,
        cantidadSecundaria: undefined,
        cantidadTerciaria: undefined,
        observaciones: undefined,
      });
    });
    expect(
      await screen.findByText(/Registro guardado correctamente/),
    ).toBeInTheDocument();
  });

  it('muestra en qué campus estás y ahí se guardará', async () => {
    render(<QuickRegisterView session={session} />);
    await screen.findByText('Servicios');
    const aviso = screen.getByText(/Estás en:/);
    expect(aviso.textContent).toMatch(/Campus Nicoya/);
    expect(aviso.textContent).toMatch(/Biblioteca Nayuribe/);
  });

  it('la bibliotecóloga no envía sedeId (cae en su sede del JWT)', async () => {
    const user = userEvent.setup();
    render(<QuickRegisterView session={session} />);
    await screen.findByText('Servicios');

    await user.click(screen.getByText('Servicios'));
    await user.click(await screen.findByText('Consultas en sala'));
    await user.click(
      screen.getByRole('button', { name: '+ Guardar Registro de Atención' }),
    );

    await waitFor(() => {
      expect(mockedApi.crearRegistro).toHaveBeenCalledWith(
        expect.not.objectContaining({ sedeId: expect.anything() }),
      );
    });
  });

  it('la jefa guarda en el campus donde entró (sesión Liberia → sedeId 2)', async () => {
    const user = userEvent.setup();
    const jefaLiberia: UserSession = {
      ...session,
      email: 'jefa@una.cr',
      role: 'jefa',
      campus: 'liberia',
      campusId: 2,
      name: 'Jefa',
    };
    render(<QuickRegisterView session={jefaLiberia} />);
    await screen.findByText('Servicios');

    const aviso = screen.getByText(/Estás en:/);
    expect(aviso.textContent).toMatch(/Campus Liberia/);

    await user.click(screen.getByText('Servicios'));
    await user.click(await screen.findByText('Consultas en sala'));
    await user.click(
      screen.getByRole('button', { name: '+ Guardar Registro de Atención' }),
    );

    await waitFor(() => {
      expect(mockedApi.crearRegistro).toHaveBeenCalledWith(
        expect.objectContaining({ sedeId: 2 }),
      );
    });
    expect(
      await screen.findByText(/Registro guardado correctamente.*Campus Liberia/),
    ).toBeInTheDocument();
  });

  it('sin categoría muestra error y no llama a la api', async () => {
    const user = userEvent.setup();
    render(<QuickRegisterView session={session} />);

    await screen.findByText('Servicios');
    await user.click(
      screen.getByRole('button', { name: '+ Guardar Registro de Atención' }),
    );

    expect(
      await screen.findByText('Seleccione una categoría y un ciclo lectivo.'),
    ).toBeInTheDocument();
    expect(mockedApi.crearRegistro).not.toHaveBeenCalled();
  });

  it('categoría doble pide personas y las envía', async () => {
    const user = userEvent.setup();
    render(<QuickRegisterView session={session} />);

    await user.click(await screen.findByText('Servicios'));
    await user.click(await screen.findByText('Taller de inducción'));

    const personas = await screen.findByPlaceholderText('Ej. 20');
    await user.type(personas, '25');
    await user.click(
      screen.getByRole('button', { name: '+ Guardar Registro de Atención' }),
    );

    await waitFor(() => {
      expect(mockedApi.crearRegistro).toHaveBeenCalledWith(
        expect.objectContaining({
          categoriaId: 12,
          cantidadSecundaria: 25,
        }),
      );
    });
  });

  it('cantidad inválida nunca se envía menor a 1', async () => {
    const user = userEvent.setup();
    render(<QuickRegisterView session={session} />);

    await user.click(await screen.findByText('Servicios'));
    await user.click(await screen.findByText('Consultas en sala'));

    const cantidad = screen.getByRole('spinbutton');
    await user.clear(cantidad);
    await user.type(cantidad, '-');
    await user.click(
      screen.getByRole('button', { name: '+ Guardar Registro de Atención' }),
    );

    await waitFor(() => {
      expect(mockedApi.crearRegistro).toHaveBeenCalledWith(
        expect.objectContaining({ cantidad: 1 }),
      );
    });
  });

  it('categoría con subcategorías exige elegir una y envía la subcategoría', async () => {
    const user = userEvent.setup();
    render(<QuickRegisterView session={session} />);

    await user.click(await screen.findByText('Servicios'));
    await user.click(await screen.findByText('Computadoras'));

    // Aparece el paso 3 de subcategoría.
    expect(
      await screen.findByText(/Subcategoría de Servicio/),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: '+ Guardar Registro de Atención' }),
    );
    expect(
      await screen.findByText('Seleccione una subcategoría de la categoría elegida.'),
    ).toBeInTheDocument();
    expect(mockedApi.crearRegistro).not.toHaveBeenCalled();

    await user.click(await screen.findByText('Préstamo en Campus'));
    await user.click(
      screen.getByRole('button', { name: '+ Guardar Registro de Atención' }),
    );

    await waitFor(() => {
      expect(mockedApi.crearRegistro).toHaveBeenCalledWith(
        expect.objectContaining({ categoriaId: 16 }),
      );
    });
  });

  it('capacitación (triple) pide personas y tiempo, y los envía', async () => {
    const user = userEvent.setup();
    render(<QuickRegisterView session={session} />);

    await user.click(await screen.findByText('Servicios'));
    await user.click(await screen.findByText('Capacitaciones'));

    const personas = await screen.findByPlaceholderText('Ej. 20');
    await user.type(personas, '12');
    const tiempo = await screen.findByPlaceholderText('Ej. 1:30');
    await user.type(tiempo, '1:30');

    await user.click(
      screen.getByRole('button', { name: '+ Guardar Registro de Atención' }),
    );

    await waitFor(() => {
      expect(mockedApi.crearRegistro).toHaveBeenCalledWith(
        expect.objectContaining({
          categoriaId: 17,
          cantidadSecundaria: 12,
          cantidadTerciaria: '1:30',
        }),
      );
    });
  });

  it('al elegir una categoría colapsa el resto y al tocarla de nuevo reaparecen', async () => {
    const user = userEvent.setup();
    render(<QuickRegisterView session={session} />);

    await user.click(await screen.findByText('Servicios'));
    expect(await screen.findByText('Taller de inducción')).toBeInTheDocument();

    await user.click(screen.getByText('Consultas en sala'));

    await waitFor(() =>
      expect(screen.queryByText('Taller de inducción')).not.toBeInTheDocument(),
    );
    expect(
      screen.getByText('Tocá la categoría de nuevo para ver las demás.'),
    ).toBeInTheDocument();

    await user.click(screen.getByText('Consultas en sala'));

    expect(await screen.findByText('Taller de inducción')).toBeInTheDocument();
    expect(
      screen.queryByText('Tocá la categoría de nuevo para ver las demás.'),
    ).not.toBeInTheDocument();
  });

  it('muestra el ciclo vigente aunque el catálogo de ciclos llegue después', async () => {
    const cicloII: CicloDto = {
      id: 8,
      anio: 2026,
      numero: 2,
      fechaInicio: '2026-07-14',
      fechaFin: '2026-11-28',
    };
    mockedApi.ciclos.mockResolvedValue([CICLOS[0] as CicloDto, cicloII]);
    mockedApi.cicloActual.mockResolvedValue(cicloII);

    render(<QuickRegisterView session={session} />);
    await screen.findByText('Servicios');

    const select = screen.getAllByRole('combobox')[0] as HTMLSelectElement;
    await waitFor(() => expect(select.value).toBe('8'));
  });

  it('el historial muestra el tiempo de las capacitaciones', async () => {
    mockedApi.registros.mockResolvedValue({
      data: [
        {
          id: 'r-cap',
          usuarioId: 'u-1',
          sedeId: 1,
          categoriaId: 17,
          cicloId: 7,
          cantidad: 1,
          cantidadSecundaria: 12,
          cantidadTerciaria: 90,
          fechaHora: '2026-03-01 10:00:00',
          observaciones: null,
          categoria: {
            id: 17,
            moduloId: 1,
            nombre: 'Capacitaciones',
            tipoMetrica: 'triple',
            activo: true,
            creadoPor: null,
            categoriaPadreId: null,
          },
        },
      ],
      total: 1,
      page: 1,
      limit: 20,
    });

    render(<QuickRegisterView session={session} />);

    expect(await screen.findByText('12 personas · 1:30')).toBeInTheDocument();
  });
});

describe('QuickRegisterView — POA', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCargaInicial();
    // jsdom no implementa scrollIntoView (lo usa GestionCapacitaciones).
    Element.prototype.scrollIntoView = vi.fn();
  });

  const guardar = () =>
    screen.getByRole('button', { name: '+ Guardar Registro de Atención' });

  // Las metas de POA son solo de la jefatura (`permiso_creacion: 'jefa'`).
  const jefa: UserSession = {
    ...session,
    role: 'jefa',
    email: 'jefa@una.cr',
    name: 'Jefa',
  };

  it('la bibliotecóloga no ve Metas y sí puede cargar Evidencia', async () => {
    const user = userEvent.setup();
    render(<QuickRegisterView session={session} />);

    await user.click(await screen.findByText('POA'));

    expect(await screen.findByText('Evidencia')).toBeInTheDocument();
    expect(screen.queryByText('Metas')).not.toBeInTheDocument();
  });

  it('Metas pide el texto de la meta y lo envía como cantidad 1', async () => {
    const user = userEvent.setup();
    render(<QuickRegisterView session={jefa} />);

    await user.click(await screen.findByText('POA'));
    await user.click(await screen.findByText('Metas'));

    const meta = await screen.findByPlaceholderText('Ej. Semana del Libro');
    // La categoría de metas no ofrece enlace de evidencia.
    expect(screen.queryByPlaceholderText('Ej. https://una.cr/album')).toBeNull();

    await user.click(guardar());
    expect(await screen.findByText('Indique la meta del renglón.')).toBeInTheDocument();
    expect(mockedApi.crearRegistro).not.toHaveBeenCalled();

    await user.type(meta, 'Semana del Libro');
    await user.click(guardar());

    await waitFor(() => {
      expect(mockedApi.crearRegistro).toHaveBeenCalledWith(
        expect.objectContaining({
          categoriaId: 30,
          meta: 'Semana del Libro',
          cantidad: 1,
        }),
      );
    });
  });

  it('Evidencia exige la meta y el enlace a la vez', async () => {
    const user = userEvent.setup();
    render(<QuickRegisterView session={session} />);

    await user.click(await screen.findByText('POA'));
    await user.click(await screen.findByText('Evidencia'));

    const meta = await screen.findByPlaceholderText('Ej. Semana del Libro');
    await screen.findByPlaceholderText('Ej. https://una.cr/album');

    await user.click(guardar());
    expect(await screen.findByText('Indique la meta del renglón.')).toBeInTheDocument();

    await user.type(meta, 'Talleres de APA');
    await user.click(guardar());
    expect(await screen.findByText('Indique el enlace de la evidencia.')).toBeInTheDocument();
    expect(mockedApi.crearRegistro).not.toHaveBeenCalled();

    await user.type(
      screen.getByPlaceholderText('Ej. https://una.cr/album'),
      'https://una.cr/apa',
    );
    await user.click(guardar());

    await waitFor(() => {
      expect(mockedApi.crearRegistro).toHaveBeenCalledWith(
        expect.objectContaining({
          categoriaId: 31,
          meta: 'Talleres de APA',
          evidencia: 'https://una.cr/apa',
        }),
      );
    });
  });
});

describe('QuickRegisterView — Desarrollo Personal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCargaInicial();
    // jsdom no implementa scrollIntoView (lo usa GestionCapacitaciones).
    Element.prototype.scrollIntoView = vi.fn();
  });

  const jefa: UserSession = {
    ...session,
    role: 'jefa',
    email: 'jefa@una.cr',
    name: 'Jefa',
  };
  const guardar = () =>
    screen.getByRole('button', { name: '+ Guardar Registro de Atención' });

  it('el cuadrito "+ Agregar capacitación" solo lo ve la jefatura', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<QuickRegisterView session={session} />);
    await user.click(await screen.findByText('Desarrollo Personal'));
    expect(screen.queryByTestId('agregar-capacitacion')).toBeNull();
    unmount();

    render(<QuickRegisterView session={jefa} />);
    await user.click(await screen.findByText('Desarrollo Personal'));
    expect(await screen.findByTestId('agregar-capacitacion')).toBeInTheDocument();
    expect(
      await screen.findByTestId('boton-agregar-capacitacion'),
    ).toBeInTheDocument();
  });

  it('registra asistentes sin pedir cantidad ni ciclo', async () => {
    const user = userEvent.setup();
    render(<QuickRegisterView session={jefa} />);

    await user.click(await screen.findByText('Desarrollo Personal'));
    // La capacitación aparece en la grilla de categorías y, para la jefa,
    // también en el listado de gestión: se elige la de la grilla (un botón).
    await user.click(
      await screen.findByRole('button', { name: /Taller de APA/ }),
    );

    expect(await screen.findByTestId('selector-asistentes')).toBeInTheDocument();
    // Sin campo de cantidad ni de ciclo: los resuelve el backend.
    expect(screen.queryByRole('spinbutton')).toBeNull();
    expect(screen.queryByRole('combobox')).toBeNull();

    await user.click(guardar());
    expect(
      await screen.findByText(/Seleccione al menos un empleado/),
    ).toBeInTheDocument();
    expect(mockedApi.crearRegistro).not.toHaveBeenCalled();

    await user.click(await screen.findByLabelText(/Empleado Uno/));
    await user.click(await screen.findByLabelText(/Empleado Dos/));
    expect(screen.getByTestId('contador-asistentes').textContent).toContain('2');

    await user.click(guardar());

    await waitFor(() => {
      expect(mockedApi.crearRegistro).toHaveBeenCalledWith(
        expect.objectContaining({
          categoriaId: 40,
          cantidad: 1,
          asistentes: ['u-1', 'u-2'],
        }),
      );
    });

    const cuerpo = mockedApi.crearRegistro.mock.calls[0][0];
    expect('cicloId' in cuerpo).toBe(false);
  });

  it('la jefa crea una capacitación con los cinco datos', async () => {
    const user = userEvent.setup();
    render(<QuickRegisterView session={jefa} />);

    await user.click(await screen.findByText('Desarrollo Personal'));
    await user.click(await screen.findByTestId('boton-agregar-capacitacion'));

    await user.click(screen.getByRole('button', { name: 'Crear capacitación' }));
    expect(
      await screen.findByText('Indique el nombre de la capacitación.'),
    ).toBeInTheDocument();
    expect(mockedApi.crearCategoria).not.toHaveBeenCalled();

    await user.type(
      screen.getByLabelText(/Nombre de la capacitación/),
      'Taller de APA',
    );
    await user.type(screen.getByLabelText(/Expositor/), 'Ana Rodríguez');
    await user.type(
      screen.getByLabelText(/Institución o departamento/),
      'Departamento de Biblioteca',
    );
    await user.type(screen.getByLabelText(/Duración/), '1:30');
    fireEvent.change(screen.getByLabelText(/Fecha/), {
      target: { value: '2026-03-15' },
    });

    await user.click(screen.getByRole('button', { name: 'Crear capacitación' }));

    await waitFor(() => {
      expect(mockedApi.crearCategoria).toHaveBeenCalledWith({
        moduloId: 9,
        nombre: 'Taller de APA',
        expositor: 'Ana Rodríguez',
        institucion: 'Departamento de Biblioteca',
        duracionMinutos: 90,
        fechaEvento: '2026-03-15',
        tipoMetrica: 'asistentes',
      });
    });
  });
});
