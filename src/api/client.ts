import {
  CategoriaDto,
  CicloDto,
  ComparativoSedesDto,
  ComposicionDto,
  KpisDto,
  ModuloDto,
  PaginatedRegistros,
  PorAnioDto,
  PorCategoriaDto,
  RegistroDto,
  SedeDto,
  UsuarioDto,
} from '../types';

const BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ??
  '/api';

const TOKEN_KEY = 'biblioteca_token';
const SESSION_KEY = 'biblioteca_session';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(accessToken: string, session: unknown): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function getSession<T>(): T | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

class ApiError extends Error {
  statusCode: number;
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = 'Error en la solicitud.';
    try {
      const body = await response.json();
      if (Array.isArray(body.message)) {
        message = body.message.join(', ');
      } else if (typeof body.message === 'string') {
        message = body.message;
      }
    } catch {
      // cuerpo vacío o no JSON
    }
    throw new ApiError(message, response.status);
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    return (await response.json()) as T;
  }
  return undefined as T;
}

export const api = {
  // ===== Auth =====
  login: (email: string, password: string) =>
    request<{ accessToken: string; usuario: UsuarioDto }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  me: () => request<{ accessToken: string; usuario: UsuarioDto }>('/auth/me'),

  // ===== Catálogos =====
  sedes: () => request<SedeDto[]>('/sedes'),
  modulos: () => request<ModuloDto[]>('/modulos'),

  // ===== Usuarios (solo jefa) =====
  usuarios: () => request<UsuarioDto[]>('/usuarios'),
  crearUsuario: (body: {
    nombreCompleto: string;
    email: string;
    password?: string;
    rol: 'bibliotecologa' | 'jefa';
    sedeId: number;
  }) =>
    request<UsuarioDto>('/usuarios', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  desactivarUsuario: (id: string) =>
    request<UsuarioDto>(`/usuarios/${id}/desactivar`, { method: 'PATCH' }),

  // ===== Categorías =====
  categorias: (moduloId?: number) =>
    request<CategoriaDto[]>(
      `/categorias${moduloId ? `?modulo_id=${moduloId}` : ''}`,
    ),
  crearCategoria: (body: {
    moduloId: number;
    nombre: string;
    tipoMetrica: 'simple' | 'doble';
  }) =>
    request<CategoriaDto>('/categorias', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  actualizarCategoria: (
    id: number,
    body: { nombre?: string; moduloId?: number; activo?: boolean },
  ) =>
    request<CategoriaDto>(`/categorias/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  // ===== Ciclos =====
  ciclos: () => request<CicloDto[]>('/ciclos'),
  cicloActual: () => request<CicloDto>('/ciclos/actual'),
  crearCiclo: (body: {
    anio: number;
    numero: 1 | 2;
    fechaInicio: string;
    fechaFin: string;
  }) =>
    request<CicloDto>('/ciclos', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  actualizarCiclo: (
    id: number,
    body: Partial<{ anio: number; numero: 1 | 2; fechaInicio: string; fechaFin: string }>,
  ) =>
    request<CicloDto>(`/ciclos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  // ===== Registros =====
  crearRegistro: (body: {
    categoriaId: number;
    cicloId: number;
    cantidad: number;
    cantidadSecundaria?: number;
    observaciones?: string;
  }) =>
    request<RegistroDto>('/registros', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  registros: (params?: Record<string, string | number>) => {
    const qs = params
      ? '?' +
        new URLSearchParams(
          Object.entries(params).map(([k, v]) => [k, String(v)]),
        ).toString()
      : '';
    return request<PaginatedRegistros>(`/registros${qs}`);
  },

  // ===== Dashboard =====
  kpis: (cicloId?: number, sedeId?: number) => {
    const params = new URLSearchParams();
    if (cicloId) params.set('cicloId', String(cicloId));
    if (sedeId) params.set('sedeId', String(sedeId));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<KpisDto>(`/dashboard/kpis${qs}`);
  },
  porCategoria: (cicloId?: number, moduloId?: number, sedeId?: number) => {
    const params = new URLSearchParams();
    if (cicloId) params.set('cicloId', String(cicloId));
    if (moduloId) params.set('moduloId', String(moduloId));
    if (sedeId) params.set('sedeId', String(sedeId));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<PorCategoriaDto[]>(`/dashboard/por-categoria${qs}`);
  },
  composicion: (cicloId?: number, moduloId?: number, sedeId?: number) => {
    const params = new URLSearchParams();
    if (cicloId) params.set('cicloId', String(cicloId));
    if (moduloId) params.set('moduloId', String(moduloId));
    if (sedeId) params.set('sedeId', String(sedeId));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<ComposicionDto[]>(`/dashboard/composicion${qs}`);
  },
  comparativoSedes: (cicloId?: number) =>
    request<ComparativoSedesDto[]>(
      `/dashboard/comparativo-sedes${cicloId ? `?cicloId=${cicloId}` : ''}`,
    ),
  porAnio: (moduloId?: number, sedeId?: number, anio?: number) => {
    const params = new URLSearchParams();
    if (moduloId) params.set('moduloId', String(moduloId));
    if (sedeId) params.set('sedeId', String(sedeId));
    if (anio) params.set('anio', String(anio));
    const qs = params.toString() ? `?${params.toString()}` : '';
    return request<PorAnioDto[]>(`/dashboard/por-anio${qs}`);
  },

  // ===== Reportes =====
  exportarReporte: async (params: {
    formato: 'pdf' | 'excel';
    cicloId?: number;
    anio?: number;
    sedeId?: number;
    membrete?: boolean;
  }): Promise<{ contenido: Blob; nombre: string }> => {
    const token = getToken();
    const urlParams = new URLSearchParams();
    urlParams.set('formato', params.formato);
    if (params.cicloId) urlParams.set('cicloId', String(params.cicloId));
    if (params.anio) urlParams.set('anio', String(params.anio));
    if (params.sedeId) urlParams.set('sedeId', String(params.sedeId));
    if (params.membrete !== undefined)
      urlParams.set('membrete', String(params.membrete));

    const response = await fetch(
      `${BASE_URL}/reportes/exportar?${urlParams.toString()}`,
      {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      },
    );

    if (!response.ok) {
      let message = 'Error al exportar el reporte.';
      try {
        const body = await response.json();
        if (Array.isArray(body.message)) {
          message = body.message.join(', ');
        } else if (typeof body.message === 'string') {
          message = body.message;
        }
      } catch {
        // cuerpo vacío o no JSON
      }
      throw new Error(message);
    }

    const contenido = await response.blob();
    const contentDisposition = response.headers.get('content-disposition') ?? '';
    const match = contentDisposition.match(/filename="?([^";]+)"?/);
    const nombre = match
      ? match[1]
      : `reporte-atenciones-${new Date().toISOString().slice(0, 10)}.${params.formato}`;
    return { contenido, nombre };
  },
};
