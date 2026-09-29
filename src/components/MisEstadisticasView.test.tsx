import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from '../api/client';
import type { UserSession } from '../types';
import { MisEstadisticasView } from './MisEstadisticasView';

vi.mock('../api/client');

const mockedApi = vi.mocked(api);
const session: UserSession = {
  accessToken: 'token', email: 'biblio@una.cr', role: 'bibliotecologa',
  campus: 'nicoya', campusId: 1, name: 'Biblio Nicoya', userId: 'u-1',
};

beforeEach(() => {
  vi.clearAllMocks();
  mockedApi.ciclos.mockResolvedValue([{ id: 1, anio: 2026, numero: 1, fechaInicio: '2026-02-01', fechaFin: '2026-06-30' }]);
  mockedApi.cicloActual.mockResolvedValue({ id: 1, anio: 2026, numero: 1, fechaInicio: '2026-02-01', fechaFin: '2026-06-30' });
  mockedApi.modulos.mockResolvedValue([{ id: 1, nombre: 'Circulación' }, { id: 2, nombre: 'RAI' }]);
  mockedApi.categorias.mockResolvedValue([
    { id: 9, moduloId: 1, nombre: 'Computadoras', tipoMetrica: 'simple', activo: true, creadoPor: null, categoriaPadreId: null },
    { id: 10, moduloId: 1, nombre: 'Préstamo', tipoMetrica: 'simple', activo: true, creadoPor: null, categoriaPadreId: 9 },
    { id: 11, moduloId: 1, nombre: 'Devolución', tipoMetrica: 'simple', activo: true, creadoPor: null, categoriaPadreId: 9 },
  ]);
  mockedApi.misEstadisticas.mockResolvedValue({
    filas: [
      { usuarioId: 'u-1', nombreCompleto: 'Biblio Nicoya', categoriaId: 10, categoriaNombre: 'Préstamo', categoriaPadreNombre: '', moduloNombre: 'Circulación', total: 8, totalPersonas: 0, totalTiempo: 0, origen: 'atencion' },
      { usuarioId: 'u-1', nombreCompleto: 'Biblio Nicoya', categoriaId: 11, categoriaNombre: 'Devolución', categoriaPadreNombre: 'Computadoras', moduloNombre: 'Circulación', total: 2, totalPersonas: 4, totalTiempo: 0, origen: 'atencion' },
    ],
    subtotales: [
      { moduloNombre: 'Circulación', total: 10, totalPersonas: 4, totalTiempo: 0 },
    ],
    totalGeneral: { total: 10, totalPersonas: 4, totalTiempo: 0 },
  });
});

describe('MisEstadisticasView', () => {
  it('muestra únicamente el resumen personal y la dona por módulo', async () => {
    render(<MisEstadisticasView session={session} />);

    expect(await screen.findByText('Mis estadísticas')).toBeInTheDocument();
    expect(await screen.findByText('Módulo principal')).toBeInTheDocument();
    expect(screen.getAllByText('Circulación').length).toBeGreaterThan(0);
    expect(screen.getByTestId('dona-mis-modulos')).toBeInTheDocument();
    // Todos los módulos → barras laterales, igual que el Dashboard.
    expect(screen.getByTestId('barras-mis-estadisticas')).toHaveAttribute(
      'data-orientacion',
      'horizontal',
    );
    expect(screen.queryByText('Ranking del personal')).toBeNull();
    expect(mockedApi.misEstadisticas).toHaveBeenCalledWith(
      { cicloId: 1, anio: undefined, desde: undefined, hasta: undefined, moduloId: undefined, categoriaId: undefined },
      expect.any(AbortSignal),
    );
  });

  it('al filtrar por módulo vuelve a consultar sus propios datos', async () => {
    const user = userEvent.setup();
    render(<MisEstadisticasView session={session} />);
    await screen.findByText('Mis estadísticas');

    await user.selectOptions(screen.getByLabelText('Módulo'), '1');
    await waitFor(() => {
      expect(mockedApi.misEstadisticas).toHaveBeenLastCalledWith(
        { cicloId: 1, anio: undefined, desde: undefined, hasta: undefined, moduloId: 1, categoriaId: undefined },
        expect.any(AbortSignal),
      );
    });
    expect(await screen.findByTestId('barras-mis-estadisticas')).toBeInTheDocument();
    expect(screen.queryByTestId('dona-mis-modulos')).toBeNull();
    // Un módulo concreto → barras verticales, igual que el Dashboard.
    expect(screen.getByTestId('barras-mis-estadisticas')).toHaveAttribute(
      'data-orientacion',
      'vertical',
    );
    // Sin categoría elegida las subcategorías se agrupan bajo la raíz.
    expect(screen.getAllByText('Computadoras').length).toBeGreaterThan(0);

    await user.selectOptions(
      screen.getByLabelText('Categoría del servicio'),
      '9',
    );
    await waitFor(() => {
      expect(mockedApi.misEstadisticas).toHaveBeenLastCalledWith(
        { cicloId: 1, anio: undefined, desde: undefined, hasta: undefined, moduloId: 1, categoriaId: 9 },
        expect.any(AbortSignal),
      );
    });
    // Con raíz elegida se muestran sus modalidades específicas.
    expect(screen.getAllByText('Préstamo').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Devolución').length).toBeGreaterThan(0);
  });
});
