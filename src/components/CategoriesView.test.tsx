import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import type { CategoriaDto, ModuloDto, UserSession } from '../types';
import { CategoriesView } from './CategoriesView';

vi.mock('../api/client');

const mockedApi = vi.mocked(api);

const session: UserSession = {
  accessToken: 'tok',
  email: 'jefa@una.cr',
  role: 'jefa',
  campus: 'liberia',
  campusId: 2,
  name: 'Jefa Liberia',
  userId: 'u-1',
};

const MODULOS: ModuloDto[] = [
  { id: 1, nombre: 'Servicios' },
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
    nombre: 'Préstamo de computadoras',
    tipoMetrica: 'doble',
    activo: true,
    creadoPor: null,
    categoriaPadreId: null,
  },
  {
    id: 13,
    moduloId: 1,
    nombre: 'Búsqueda antigua',
    tipoMetrica: 'simple',
    activo: false,
    creadoPor: null,
    categoriaPadreId: null,
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.categorias.mockResolvedValue(CATEGORIAS);
  mockedApi.modulos.mockResolvedValue(MODULOS);
  mockedApi.crearCategoria.mockResolvedValue(CATEGORIAS[0] as CategoriaDto);
  mockedApi.actualizarCategoria.mockResolvedValue(CATEGORIAS[0] as CategoriaDto);
});

describe('CategoriesView', () => {
  it('muestra una tabla con las categorías activas y las archivadas por separado', async () => {
    render(<CategoriesView session={session} />);

    await screen.findByText('Consultas en sala');
    expect(screen.getByText('Préstamo de computadoras')).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Módulo' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Categoría' })).toBeInTheDocument();

    // La archivada no aparece por defecto en la vista Activas
    expect(screen.queryByText('Búsqueda antigua')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Activas/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Archivadas/ })).toBeInTheDocument();
  });

  it('al cambiar a Archivadas solo muestra las desactivadas', async () => {
    render(<CategoriesView session={session} />);
    await screen.findByText('Consultas en sala');

    await userEvent.click(screen.getByRole('button', { name: /Archivadas/ }));

    expect(await screen.findByText('Búsqueda antigua')).toBeInTheDocument();
    expect(screen.queryByText('Consultas en sala')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reactivar' })).toBeInTheDocument();
  });

  it('desactiva una categoría y la mueve a Archivadas', async () => {
    render(<CategoriesView session={session} />);
    await screen.findByText('Consultas en sala');

    await userEvent.click(
      screen.getAllByRole('button', { name: 'Desactivar' })[0],
    );
    await waitFor(() =>
      expect(mockedApi.actualizarCategoria).toHaveBeenCalledWith(11, { activo: false }),
    );

    expect(screen.queryByText('Consultas en sala')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Archivadas/ }));
    expect(await screen.findByText('Consultas en sala')).toBeInTheDocument();
  });

  it('reactiva una categoría desde Archivadas', async () => {
    render(<CategoriesView session={session} />);
    await screen.findByText('Consultas en sala');

    await userEvent.click(screen.getByRole('button', { name: /Archivadas/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Reactivar' }));

    await waitFor(() =>
      expect(mockedApi.actualizarCategoria).toHaveBeenCalledWith(13, { activo: true }),
    );
  });

  it('muestra mensaje vacío cuando no hay categorías en la vista', async () => {
    mockedApi.categorias.mockResolvedValue([]);
    render(<CategoriesView session={session} />);

    expect(await screen.findByText('No hay categorías activas.')).toBeInTheDocument();
  });

  it('pagina de 6 en 6 con Anterior y Siguiente', async () => {
    const many: CategoriaDto[] = Array.from({ length: 8 }, (_, i) => ({
      id: 100 + i,
      moduloId: 1,
      nombre: `Categoría ${i + 1}`,
      tipoMetrica: 'simple' as const,
      activo: true,
      creadoPor: null,
      categoriaPadreId: null,
    }));
    mockedApi.categorias.mockResolvedValue(many);
    render(<CategoriesView session={session} />);

    await screen.findByText('Categoría 1');
    expect(screen.getByText('Categoría 6')).toBeInTheDocument();
    expect(screen.queryByText('Categoría 7')).not.toBeInTheDocument();
    expect(screen.getByText('Mostrando 1–6 de 8')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página anterior' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));

    expect(await screen.findByText('Categoría 7')).toBeInTheDocument();
    expect(screen.queryByText('Categoría 1')).not.toBeInTheDocument();
    expect(screen.getByText('Mostrando 7–8 de 8')).toBeInTheDocument();
    expect(screen.getByText('Página 2 de 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Página siguiente' })).toBeDisabled();

    await userEvent.click(screen.getByRole('button', { name: 'Página anterior' }));

    expect(await screen.findByText('Categoría 1')).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
  });

  it('vuelve a la primera página al cambiar de pestaña', async () => {
    const many: CategoriaDto[] = Array.from({ length: 8 }, (_, i) => ({
      id: 100 + i,
      moduloId: 1,
      nombre: `Categoría ${i + 1}`,
      tipoMetrica: 'simple' as const,
      activo: true,
      creadoPor: null,
      categoriaPadreId: null,
    }));
    mockedApi.categorias.mockResolvedValue(many);
    render(<CategoriesView session={session} />);

    await screen.findByText('Categoría 1');
    await userEvent.click(screen.getByRole('button', { name: 'Página siguiente' }));
    await screen.findByText('Categoría 7');

    await userEvent.click(screen.getByRole('button', { name: /Archivadas/ }));
    expect(await screen.findByText('No hay categorías archivadas.')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Activas/ }));
    expect(await screen.findByText('Categoría 1')).toBeInTheDocument();
    expect(screen.getByText('Página 1 de 2')).toBeInTheDocument();
  });

  it('filtra por nombre', async () => {
    render(<CategoriesView session={session} />);
    await screen.findByText('Consultas en sala');

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Filtrar por nombre' }),
      'préstamo',
    );

    expect(await screen.findByText('Préstamo de computadoras')).toBeInTheDocument();
    expect(screen.queryByText('Consultas en sala')).not.toBeInTheDocument();
    expect(screen.getByText('Mostrando 1–1 de 1')).toBeInTheDocument();
  });

  it('filtra por módulo', async () => {
    mockedApi.modulos.mockResolvedValue([
      { id: 1, nombre: 'Servicios' },
      { id: 2, nombre: 'Préstamos' },
    ]);
    mockedApi.categorias.mockResolvedValue([
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
        id: 21,
        moduloId: 2,
        nombre: 'Préstamo a domicilio',
        tipoMetrica: 'simple',
        activo: true,
        creadoPor: null,
        categoriaPadreId: null,
      },
    ]);
    render(<CategoriesView session={session} />);
    await screen.findByText('Consultas en sala');

    await userEvent.selectOptions(
      screen.getByRole('combobox', { name: 'Filtrar por módulo' }),
      '2',
    );

    expect(await screen.findByText('Préstamo a domicilio')).toBeInTheDocument();
    expect(screen.queryByText('Consultas en sala')).not.toBeInTheDocument();
  });

  it('limpia los filtros aplicados', async () => {
    render(<CategoriesView session={session} />);
    await screen.findByText('Consultas en sala');

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Filtrar por nombre' }),
      'préstamo',
    );
    expect(await screen.findByText('Préstamo de computadoras')).toBeInTheDocument();
    expect(screen.queryByText('Consultas en sala')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Limpiar' }));

    expect(await screen.findByText('Consultas en sala')).toBeInTheDocument();
    expect(screen.getByText('Préstamo de computadoras')).toBeInTheDocument();
  });

  it('muestra mensaje de sin resultados cuando el filtro no coincide', async () => {
    render(<CategoriesView session={session} />);
    await screen.findByText('Consultas en sala');

    await userEvent.type(
      screen.getByRole('textbox', { name: 'Filtrar por nombre' }),
      'zzz-inexistente',
    );

    expect(
      await screen.findByText('Sin resultados para el filtro aplicado.'),
    ).toBeInTheDocument();
  });

  it('muestra un toast arriba al archivar una categoría', async () => {
    render(<CategoriesView session={session} />);
    await screen.findByText('Consultas en sala');

    await userEvent.click(
      screen.getAllByRole('button', { name: 'Desactivar' })[0],
    );

    const toast = await screen.findByRole('status');
    expect(toast).toHaveTextContent('«Consultas en sala» se archivó.');
  });

  it('muestra un toast al reactivar y permite cerrarlo', async () => {
    render(<CategoriesView session={session} />);
    await screen.findByText('Consultas en sala');

    await userEvent.click(screen.getByRole('button', { name: /Archivadas/ }));
    await userEvent.click(await screen.findByRole('button', { name: 'Reactivar' }));

    expect(
      await screen.findByText('«Búsqueda antigua» se reactivó.'),
    ).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Cerrar aviso' }));
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('muestra subcategorías anidadas y permite moverlas de categoría padre', async () => {
    mockedApi.categorias.mockResolvedValue([
      {
        id: 11,
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
        categoriaPadreId: 11,
      },
    ]);
    render(<CategoriesView session={session} />);

    await screen.findByText('Computadoras');
    expect(screen.getByText('Préstamo en Campus')).toBeInTheDocument();

    const selectorPadre = screen.getByRole('combobox', {
      name: 'Categoría padre de Préstamo en Campus',
    });
    expect(selectorPadre).toHaveValue('11');

    await userEvent.selectOptions(selectorPadre, '');

    await waitFor(() =>
      expect(mockedApi.actualizarCategoria).toHaveBeenCalledWith(16, {
        categoriaPadreId: null,
      }),
    );
  });
});

describe('CategoriesView — métricas de POA y Desarrollo Personal', () => {
  // Los <label> de este formulario son hermanos de sus controles (no hay
  // `for`/`id`), así que se localizan por la opción que ofrecen o por el
  // placeholder del campo.
  const selectConOpcion = (valor: string): HTMLSelectElement =>
    screen
      .getAllByRole('combobox')
      .find(
        (select): select is HTMLSelectElement =>
          Array.from((select as HTMLSelectElement).options).some(
            (opcion) => opcion.value === valor,
          ),
      ) as HTMLSelectElement;

  it('ofrece las métricas nuevas en el selector de tipo', async () => {
    render(<CategoriesView session={session} />);
    await screen.findByText('Consultas en sala');

    const selectTipo = selectConOpcion('asistentes');
    const valores = Array.from(selectTipo.options).map((o) => o.value);

    expect(valores).toEqual(
      expect.arrayContaining([
        'simple',
        'doble',
        'triple',
        'metas',
        'evidencia',
        'asistentes',
      ]),
    );
  });

  it('al elegir asistentes pide los cinco datos de la capacitación', async () => {
    render(<CategoriesView session={session} />);
    await screen.findByText('Consultas en sala');

    await userEvent.type(
      screen.getByPlaceholderText('Ej. Búsqueda Interbibliotecaria'),
      'Taller de APA',
    );
    expect(
      screen.getByPlaceholderText('Ej. Búsqueda Interbibliotecaria'),
    ).toHaveValue('Taller de APA');

    const selectModulo = screen
      .getAllByRole('combobox')
      .find((select) =>
        Array.from((select as HTMLSelectElement).options).some((opcion) =>
          opcion.textContent?.includes('Seleccionar módulo'),
        ),
      ) as HTMLSelectElement | undefined;
    expect(selectModulo).toBeDefined();
    await userEvent.selectOptions(selectModulo!, '1');
    expect(selectModulo).toHaveValue('1');

    // Los metadatos no existen hasta que la métrica es `asistentes`.
    expect(
      screen.queryByPlaceholderText('Ej. Ana Rodríguez'),
    ).not.toBeInTheDocument();

    await userEvent.selectOptions(selectConOpcion('asistentes'), 'asistentes');
    expect(
      await screen.findByPlaceholderText('Ej. Ana Rodríguez'),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar Categoría' }),
    );

    expect(
      await screen.findByText(/Debe indicar el nombre de quien imparte/),
    ).toBeInTheDocument();
    expect(mockedApi.crearCategoria).not.toHaveBeenCalled();

    await userEvent.type(
      screen.getByPlaceholderText('Ej. Ana Rodríguez'),
      'Ana Rodríguez',
    );
    await userEvent.type(
      screen.getByPlaceholderText('Ej. Departamento de Biblioteca'),
      'Departamento de Biblioteca',
    );
    await userEvent.type(screen.getByPlaceholderText('Ej. 1:30'), '1:30');
    fireEvent.change(document.querySelector('input[type="date"]')!, {
      target: { value: '2026-03-15' },
    });

    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar Categoría' }),
    );

    await waitFor(() => {
      expect(mockedApi.crearCategoria).toHaveBeenCalledWith(
        expect.objectContaining({
          moduloId: 1,
          nombre: 'Taller de APA',
          tipoMetrica: 'asistentes',
          expositor: 'Ana Rodríguez',
          institucion: 'Departamento de Biblioteca',
          duracionMinutos: 90,
          fechaEvento: '2026-03-15',
        }),
      );
    });
  });
});