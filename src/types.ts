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

export type SidebarTab =
  | 'registro'
  | 'mis-estadisticas'
  | 'dashboard'
  | 'empleados'
  | 'usuarios'
  | 'categorias'
  | 'ciclos'
  | 'reportes';

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

export type TipoMetrica =
  | 'simple'
  | 'doble'
  | 'triple'
  | 'asistentes'
  | 'metas'
  | 'evidencia';

export interface CategoriaDto {
  id: number;
  moduloId: number;
  nombre: string;
  tipoMetrica: TipoMetrica;
  activo: boolean;
  creadoPor: string | null;
  categoriaPadreId: number | null;
  /**
   * Metadatos de una capacitación (Desarrollo Personal). Opcionales porque
   * solo aplican a ese módulo: en el resto llegan como `null` o no vienen.
   */
  expositor?: string | null;
  institucion?: string | null;
  duracionMinutos?: number | null;
  fechaEvento?: string | null;
  permisoCreacion?: 'ambas' | 'jefa';
  modulo?: { id: number; nombre: string };
  categoriaPadre?: { id: number; nombre: string } | null;
  hijas?: CategoriaDto[];
}

/** Listado mínimo para el selector de asistentes (solo id y nombre). */
export interface UsuarioBasicoDto {
  id: string;
  nombreCompleto: string;
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
  /** POA: texto libre de la meta y su enlace; nulos fuera de ese módulo. */
  meta?: string | null;
  evidencia?: string | null;
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
  /** Personas de esa porción (en Desarrollo Personal, de esa capacitación). */
  totalPersonas: number;
  /** Tiempo acumulado en minutos. */
  totalTiempo: number;
}

/** Una capacitación con su gente: alimenta el panel de Desarrollo Personal. */
export interface CapacitacionDetalleDto {
  categoriaId: number;
  nombre: string;
  eventos: number;
  personas: number;
  /** Duración acumulada en minutos. */
  tiempo: number;
  asistentes: string[];
}

/** Fila del ranking de la sección Estadística por Empleado. */
export interface PorEmpleadoDto {
  usuarioId: string;
  nombreCompleto: string;
  activo: boolean;
  atenciones: number;
  personas: number;
  /** Duración acumulada en minutos. */
  tiempo: number;
  registros: number;
  /** Capacitaciones de Desarrollo Personal recibidas. */
  eventos: number;
}

/** Totales agregados del desglose de una empleada. */
export interface TotalEmpleadoDto {
  total: number;
  totalPersonas: number;
  totalTiempo: number;
}

export interface SubtotalModuloEmpleadoDto extends TotalEmpleadoDto {
  moduloNombre: string;
}

/** Fila del desglose de una empleada por categoría (nivel hoja). */
export interface PorEmpleadoDesgloseFilaDto {
  usuarioId: string;
  nombreCompleto: string;
  categoriaId: number;
  categoriaNombre: string;
  categoriaPadreNombre: string;
  moduloNombre: string;
  total: number;
  totalPersonas: number;
  totalTiempo: number;
  /** 'atencion' para registros suyos; 'capacitacion' para asistencias. */
  origen: 'atencion' | 'capacitacion';
}

export interface PorEmpleadoDesgloseDto {
  filas: PorEmpleadoDesgloseFilaDto[];
  subtotales: SubtotalModuloEmpleadoDto[];
  totalGeneral: TotalEmpleadoDto;
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

// ===== Reportes configurables (PDF y Excel) =====

export type SeccionReporte =
  | 'resumen'
  | 'modulos'
  | 'poa'
  | 'capacitaciones'
  | 'personal';

export interface FiltrosReporteDto {
  cicloId?: number;
  anio?: number;
  desde?: string;
  hasta?: string;
  sedeId?: number;
  moduloIds?: number[];
  categoriaIds?: number[];
  usuarioId?: string;
  secciones?: SeccionReporte[];
  graficos?: boolean;
  membrete?: boolean;
}

export interface FilaReporteDto {
  categoriaId: number;
  categoria: string;
  categoriaPadreId: number | null;
  categoriaPadre: string;
  moduloId: number;
  modulo: string;
  tipoMetrica: string;
  tipo: string;
  cantidad: number;
  personas: number;
  minutos: number;
  registros: number;
}

export interface ResumenModuloDto {
  moduloId: number;
  modulo: string;
  cantidad: number;
  personas: number;
  minutos: number;
  porcentaje: number;
}

export interface ResumenReporteDto {
  cantidad: number;
  personas: number;
  minutos: number;
  registros: number;
  eventos: number;
  porModulo: ResumenModuloDto[];
}

export interface BloqueModuloReporteDto {
  moduloId: number;
  modulo: string;
  cantidad: number;
  personas: number;
  minutos: number;
  filas: FilaReporteDto[];
}

export interface FilaPoaReporteDto {
  categoria: string;
  meta: string;
  evidencia: string;
  cantidad: number;
  fecha: string;
  autor: string;
}

export interface FilaCapacitacionReporteDto {
  capacitacion: string;
  expositor: string;
  institucion: string;
  fecha: string;
  duracionMinutos: number;
  empleados: string[];
  asistentes: number;
}

export interface RankingPersonalDto {
  empleado: string;
  campus?: string;
  atenciones: number;
  personas: number;
  minutos: number;
  registros: number;
  eventos: number;
}

export interface DesglosePersonalDto {
  empleado: string;
  campus?: string;
  categoria: string;
  categoriaPadre: string;
  modulo: string;
  tipo: string;
  cantidad: number;
  personas: number;
  minutos: number;
}

export interface PersonalReporteDto {
  titulo: string;
  modo: 'ranking' | 'individual';
  consolidado: boolean;
  ranking: RankingPersonalDto[];
  desglose: DesglosePersonalDto[];
  totalesRanking: {
    atenciones: number;
    personas: number;
    minutos: number;
    registros: number;
    eventos: number;
  };
  totalesDesglose: { cantidad: number; personas: number; minutos: number };
}

export interface MetadatosReporteDto {
  titulo: string;
  modo: 'institucional' | 'individual';
  empleada?: string;
  campus: string;
  periodo: string;
  filtros: string[];
  nota?: string;
  generadoEl: string;
  conMembrete: boolean;
}

export interface DatosReporteDto {
  meta: MetadatosReporteDto;
  secciones: SeccionReporte[];
  graficos: boolean;
  resumen?: ResumenReporteDto;
  modulos?: BloqueModuloReporteDto[];
  detallePoa?: FilaPoaReporteDto[];
  detalleCapacitaciones?: FilaCapacitacionReporteDto[];
  personal?: PersonalReporteDto;
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
  tipoMetrica: TipoMetrica;
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
