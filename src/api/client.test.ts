import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, clearSession, getToken, setSession } from './client';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('api client (contratos con el backend)', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    clearSession();
  });

  it('login envía POST con credenciales en JSON', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ accessToken: 't', usuario: { id: 'u' } }),
    );

    await api.login('biblio@una.cr', 'Secreta123!');

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/auth/login');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(
      JSON.stringify({ email: 'biblio@una.cr', password: 'Secreta123!' }),
    );
  });

  it('adjunta el JWT en Authorization cuando hay sesión', async () => {
    setSession('mi-token', { rol: 'jefa' });
    expect(getToken()).toBe('mi-token');
    fetchMock.mockResolvedValue(jsonResponse([]));

    await api.ciclos();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer mi-token');
  });

  it('sin token no envía Authorization', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await api.ciclos();

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });

  it('kpis arma cicloId y sedeId en el formato del backend', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ totalAtenciones: 1, totalPersonas: 0 }),
    );

    await api.kpis(3, 2);

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/dashboard/kpis?cicloId=3&sedeId=2');
  });

  it('porCategoria arma los tres filtros opcionales', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await api.porCategoria(5, 1, 2);

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      '/api/dashboard/por-categoria?cicloId=5&moduloId=1&sedeId=2',
    );
  });

  it('categorias con moduloId usa el query modulo_id del backend', async () => {
    fetchMock.mockResolvedValue(jsonResponse([]));

    await api.categorias(4);

    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/categorias?modulo_id=4');
  });

  it('propaga el 401 con statusCode para tratar la sesión como expirada', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: 'No autorizado' }, 401),
    );

    const error = await api.me().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as { statusCode?: number }).statusCode).toBe(401);
    expect((error as Error).message).toBe('No autorizado');
  });

  it('une mensajes de validación en arreglo', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse({ message: ['cantidad debe ser mayor a 0', 'otro'] }, 400),
    );

    await expect(api.ciclos()).rejects.toThrow(
      'cantidad debe ser mayor a 0, otro',
    );
  });

  it('exportarReporte arma URL, headers y nombre desde Content-Disposition', async () => {
    setSession('tok', {});
    const blob = new Blob(['excel'], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    fetchMock.mockResolvedValue({
      ok: true,
      headers: {
        get: (name: string) =>
          name.toLowerCase() === 'content-disposition'
            ? 'attachment; filename="reporte-x.xlsx"'
            : null,
      },
      blob: () => Promise.resolve(blob),
    });

    const { contenido, nombre } = await api.exportarReporte({
      formato: 'excel',
      cicloId: 7,
      sedeId: 1,
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('/api/reportes/exportar?');
    expect(url).toContain('formato=excel');
    expect(url).toContain('cicloId=7');
    expect(url).toContain('sedeId=1');
    expect((init.headers as Record<string, string>).Authorization).toBe(
      'Bearer tok',
    );
    expect(nombre).toBe('reporte-x.xlsx');
    expect(contenido.size).toBeGreaterThan(0);
  });
});
