export type CampusId = 'nicoya' | 'liberia';

export interface CampusInfo {
  id: CampusId;
  name: string;
  fullName: string;
  libraryName: string;
  location: string;
  code: string;
  description: string;
  schedule: string;
  contactEmail: string;
  phone: string;
  badge: string;
  statsPreview: {
    monthlyAttentions: number;
    loansActive: number;
    satisfactionRate: string;
  };
}

export type ViewState = 'landing' | 'login' | 'dashboard';

export type HeroStyleVariant = 'light-clean' | 'red-institutional' | 'split-accent';

export type SidebarTab = 'registro' | 'dashboard' | 'usuarios' | 'categorias' | 'ciclos' | 'reportes';

export type Rol = 'bibliotecologa' | 'jefa';

export type NivelDesglose = 'categoria' | 'subcategoria';

export interface UserSession {
  accessToken: string;
  email: string;
  role: Rol;
  campus: CampusId;
  campusId: number;
  name: string;
  userId: string;
}

// ===== Entidades del backend (camelCase como las expone la API) =====

export interface SedeDto {
  id: number;
  nombre: string;
  bibliotecaNombre: string;
}

export interface UsuarioDto {
  id: string;
  nombreCompleto: string;
  email: string;
  googleId: string | null;
  rol: Rol;
  sedeId: number;
  activo: boolean;
  sede?: SedeDto;
}

export interface ModuloDto {
  id: number;
  nombre: string;
  categorias?: CategoriaDto[];
}

export interface CategoriaDto {
  id: number;
  moduloId: number;
  nombre: string;
  tipoMetrica: 'simple' | 'doble' | 'triple';
  activo: boolean;
  creadoPor: string | null;
  categoriaPadreId: number | null;
  modulo?: { id: number; nombre: string };
  categoriaPadre?: { id: number; nombre: string } | null;
  hijas?: CategoriaDto[];
}

export interface CicloDto {
  id: number;
  anio: number;
  numero: 1 | 2;
  fechaInicio: string;
  fechaFin: string;
}

export interface RegistroDto {
  id: string;
  usuarioId: string;
  sedeId: number;
  categoriaId: number;
  cicloId: number;
  cantidad: number;
  cantidadSecundaria: number | null;
  cantidadTerciaria: number | null;
  fechaHora: string;
  observaciones: string | null;
  categoria?: CategoriaDto;
  ciclo?: CicloDto;
  sede?: SedeDto;
  usuario?: Pick<UsuarioDto, 'nombreCompleto' | 'email'>;
}

export interface PaginatedRegistros {
  data: RegistroDto[];
  total: number;
  page: number;
  limit: number;
}

export interface KpisDto {
  totalAtenciones: number;
  totalPersonas: number;
  totalTiempo: number;
}

export interface PorCategoriaDto {
  categoriaId: number;
  categoriaNombre: string;
  categoriaPadreNombre: string;
  moduloNombre: string;
  total: number;
  totalPersonas: number;
  totalTiempo: number;
}

export interface ComposicionDto {
  categoriaId: number;
  nombre: string;
  valor: number;
}

export interface ComparativoSedesDto {
  sedeId: number;
  sedeNombre: string;
  total: number;
}

export interface PorAnioDto {
  categoriaId: number;
  categoriaNombre: string;
  categoriaPadreNombre: string;
  moduloNombre: string;
  anio: number;
  total: number;
  totalPersonas: number;
  totalTiempo: number;
}

// ===== Tipos para la UI (mapeados) =====

export interface UserAccount {
  id: string;
  fullName: string;
  email: string;
  campus: CampusId;
  role: 'bibliotecologa' | 'jefatura';
  status: 'activo' | 'inactivo';
  accessMethod: 'password' | 'google';
  createdAt: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  module: string;
  campus: CampusId | 'ambas';
  description: string;
  status: 'activo' | 'inactivo';
  tipoMetrica: 'simple' | 'doble' | 'triple';
}

export interface AcademicCycle {
  id: string;
  name: string;
  year: number;
  startDate: string;
  endDate: string;
  active: boolean;
}

export interface AttendanceRecord {
  id: string;
  date: string;
  time: string;
  serviceType: string;
  userType: string;
  count: number;
  campus: CampusId;
  registeredBy: string;
  notes?: string;
}
