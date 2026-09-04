import { render, screen, waitFor } from '@testing-library/react';
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
];

const CATEGORIAS: CategoriaDto[] = [
  {
    id: 11,
    moduloId: 1,
    nombre: 'Consultas en sala',
    tipoMetrica: 'simple',
    activo: true,
    creadoPor: null,
  },
  {
    id: 12,
    moduloId: 1,
    nombre: 'Taller de inducción',
    tipoMetrica: 'doble',
    activo: true,
    creadoPor: null,
  },
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
    fechaHora: '2026-03-01 10:00:00',
    observaciones: null,
  });
}

describe('QuickRegisterView (registro de atenciones)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCargaInicial();
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
});
