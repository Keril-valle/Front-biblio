import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api/client';
import {
  CategoriaDto,
  CicloDto,
  DatosReporteDto,
  FiltrosReporteDto,
  ModuloDto,
  SeccionReporte,
  UserSession,
  UsuarioDto,
} from '../types';
import { formatearDuracion } from '../utils/duracion';

interface ReportsViewProps {
  session: UserSession;
}

type Alcance = 'ambas' | 'nicoya' | 'liberia';
type TipoPeriodo = 'ciclo' | 'anio' | 'rango' | 'todos';

const SECCIONES: Array<{
  id: SeccionReporte;
  titulo: string;
  descripcion: string;
}> = [
  {
    id: 'resumen',
    titulo: 'Resumen',
    descripcion: 'Totales, personas y tiempo por módulo.',
  },
  {
    id: 'modulos',
    titulo: 'Detalle por módulos',
    descripcion: 'Categorías, subcategorías y subtotales.',
  },
  {
    id: 'poa',
    titulo: 'POA',
    descripcion: 'Metas y evidencias renglón por renglón.',
  },
  {
    id: 'capacitaciones',
    titulo: 'Desarrollo Profesional',
    descripcion: 'Capacitaciones, asistentes y duración.',
  },
  {
    id: 'personal',
    titulo: 'Personal',
    descripcion: 'Ranking y desglose por bibliotecóloga.',
  },
];

const NOMBRE_CAMPUS: Record<number, string> = {
  1: 'Nicoya',
  2: 'Liberia',
};

const nombreCiclo = (ciclo: CicloDto) =>
  `${ciclo.numero === 1 ? 'I' : 'II'} Ciclo ${ciclo.anio}`;

const fechaLegible = (iso: string) => {
  const [anio, mes, dia] = (iso ?? '').slice(0, 10).split('-');
  if (!anio || !mes || !dia) return '—';
  return `${dia}/${mes}/${anio}`;
};

const minutos = (valor: number) =>
  valor > 0 ? formatearDuracion(valor) : '—';

interface FilaTablaProps {
  children: React.ReactNode;
  className?: string;
}

const Th: React.FC<FilaTablaProps> = ({ children, className = '' }) => (
  <th className={`px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wider ${className}`}>
    {children}
  </th>
);

const Td: React.FC<FilaTablaProps> = ({ children, className = '' }) => (
  <td className={`px-3 py-2 text-xs ${className}`}>{children}</td>
);

/**
 * Reportes institucionales: solo jefatura. La vista arma la selección, pide
 * una previsualización al backend y descarga el PDF/Excel con los mismos
 * filtros que se están viendo.
 */
export const ReportsView: React.FC<ReportsViewProps> = ({ session }) => {
  const isJefatura = session.role === 'jefa' || session.role === 'jefatura';

  const [ciclos, setCiclos] = useState<CicloDto[]>([]);
  const [modulos, setModulos] = useState<ModuloDto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaDto[]>([]);
  const [usuarios, setUsuarios] = useState<UsuarioDto[]>([]);
  const [cargandoCatalogos, setCargandoCatalogos] = useState(true);
  const [errorCatalogos, setErrorCatalogos] = useState('');

  const [alcance, setAlcance] = useState<Alcance>('ambas');
  const [tipoPeriodo, setTipoPeriodo] = useState<TipoPeriodo>('ciclo');
  const [cicloId, setCicloId] = useState<number | ''>('');
  const [anio, setAnio] = useState<number | ''>('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [moduloIds, setModuloIds] = useState<number[]>([]);
  const [todasCategorias, setTodasCategorias] = useState(true);
  const [categoriaIds, setCategoriaIds] = useState<number[]>([]);
  const [busquedaCategoria, setBusquedaCategoria] = useState('');
  const [empleadaId, setEmpleadaId] = useState('');
  const [secciones, setSecciones] = useState<SeccionReporte[]>(
    SECCIONES.map((seccion) => seccion.id),
  );
  const [graficos, setGraficos] = useState(true);
  const [membrete, setMembrete] = useState(true);

  const [preview, setPreview] = useState<DatosReporteDto | null>(null);
  const [cargandoPreview, setCargandoPreview] = useState(false);
  const [errorPreview, setErrorPreview] = useState('');
  const [generando, setGenerando] = useState<'pdf' | 'excel' | null>(null);
  const [mensaje, setMensaje] = useState('');
  const solicitud = useRef(0);

  // Catálogos iniciales (la vista ya está reservada a jefatura).
  useEffect(() => {
    if (!isJefatura) return;
    let activo = true;
    setCargandoCatalogos(true);
    Promise.all([
      api.ciclos(),
      api.modulos(),
      api.categorias(),
      api.usuarios(),
    ])
      .then(([ciclosDto, modulosDto, categoriasDto, usuariosDto]) => {
        if (!activo) return;
        setCiclos(ciclosDto);
        setModulos(modulosDto);
        setCategorias(categoriasDto);
        setUsuarios(usuariosDto);
        setModuloIds(modulosDto.map((modulo) => modulo.id));
        setCicloId(ciclosDto[0]?.id ?? '');
        const anios = [...new Set(ciclosDto.map((ciclo) => ciclo.anio))].sort(
          (a, b) => a - b,
        );
        setAnio(anios.at(-1) ?? '');
        setErrorCatalogos('');
      })
      .catch(() => {
        if (activo) {
          setErrorCatalogos('No se pudieron cargar los catálogos del reporte.');
        }
      })
      .finally(() => {
        if (activo) setCargandoCatalogos(false);
      });
    return () => {
      activo = false;
    };
  }, [isJefatura]);

  const sedeId = alcance === 'ambas' ? undefined : alcance === 'nicoya' ? 1 : 2;

  const empleadas = useMemo(
    () =>
      usuarios.filter(
        (usuario) =>
          usuario.rol === 'bibliotecologa' &&
          (sedeId === undefined || usuario.sedeId === sedeId),
      ),
    [usuarios, sedeId],
  );

  const categoriasVisibles = useMemo(() => {
    const texto = busquedaCategoria.trim().toLowerCase();
    return categorias
      .filter(
        (categoria) =>
          moduloIds.includes(categoria.moduloId) &&
          (!texto || categoria.nombre.toLowerCase().includes(texto)),
      )
      .sort((a, b) => {
        const moduloA = modulos.find((m) => m.id === a.moduloId)?.nombre ?? '';
        const moduloB = modulos.find((m) => m.id === b.moduloId)?.nombre ?? '';
        return (
          moduloA.localeCompare(moduloB, 'es') ||
          (a.categoriaPadreId ?? 0) - (b.categoriaPadreId ?? 0) ||
          a.nombre.localeCompare(b.nombre, 'es')
        );
      });
  }, [categorias, moduloIds, modulos, busquedaCategoria]);

  const errorValidacion = useMemo(() => {
    if (cargandoCatalogos) return '';
    if (moduloIds.length === 0) return 'Seleccione al menos un módulo.';
    if (tipoPeriodo === 'ciclo' && cicloId === '')
      return 'Seleccione un ciclo lectivo.';
    if (tipoPeriodo === 'anio' && anio === '')
      return 'Seleccione un año lectivo.';
    if (tipoPeriodo === 'rango') {
      if (!desde || !hasta) return 'Indique la fecha desde y la fecha hasta.';
      if (desde > hasta)
        return 'La fecha desde no puede ser posterior a la fecha hasta.';
    }
    if (!todasCategorias && categoriaIds.length === 0)
      return 'Seleccione al menos una categoría o marque “Todas”.';
    if (secciones.length === 0) return 'Seleccione al menos una sección.';
    return '';
  }, [
    cargandoCatalogos,
    moduloIds,
    tipoPeriodo,
    cicloId,
    anio,
    desde,
    hasta,
    todasCategorias,
    categoriaIds,
    secciones,
  ]);

  const filtros = useMemo<FiltrosReporteDto>(() => {
    const seleccion: FiltrosReporteDto = {
      secciones,
      graficos,
      membrete,
    };
    if (sedeId !== undefined) seleccion.sedeId = sedeId;
    if (tipoPeriodo === 'ciclo' && cicloId !== '')
      seleccion.cicloId = Number(cicloId);
    if (tipoPeriodo === 'anio' && anio !== '')
      seleccion.anio = Number(anio);
    if (tipoPeriodo === 'rango') {
      seleccion.desde = desde;
      seleccion.hasta = hasta;
    }
    if (moduloIds.length > 0) seleccion.moduloIds = moduloIds;
    if (!todasCategorias) seleccion.categoriaIds = categoriaIds;
    if (empleadaId) seleccion.usuarioId = empleadaId;
    return seleccion;
  }, [
    sedeId,
    tipoPeriodo,
    cicloId,
    anio,
    desde,
    hasta,
    moduloIds,
    todasCategorias,
    categoriaIds,
    empleadaId,
    secciones,
    graficos,
    membrete,
  ]);

  // Previsualización: se descarta cualquier respuesta que llegue tarde.
  useEffect(() => {
    if (!isJefatura || errorValidacion || cargandoCatalogos) return;
    const id = solicitud.current + 1;
    solicitud.current = id;
    const control = new AbortController();

    setCargandoPreview(true);
    setErrorPreview('');
    api
      .previsualizarReporte(filtros, control.signal)
      .then((datos) => {
        if (solicitud.current === id) setPreview(datos);
      })
      .catch((error: unknown) => {
        if (solicitud.current !== id) return;
        if (error instanceof Error && error.name === 'AbortError') return;
        setPreview(null);
        setErrorPreview(
          error instanceof Error
            ? error.message
            : 'No se pudo previsualizar el reporte.',
        );
      })
      .finally(() => {
        if (solicitud.current === id) setCargandoPreview(false);
      });

    return () => control.abort();
  }, [filtros, errorValidacion, cargandoCatalogos, isJefatura]);

  const cambiarAlcance = (nuevo: Alcance) => {
    setAlcance(nuevo);
    const nuevaSede = nuevo === 'ambas' ? undefined : nuevo === 'nicoya' ? 1 : 2;
    if (empleadaId) {
      const empleada = usuarios.find((usuario) => usuario.id === empleadaId);
      if (!empleada || (nuevaSede !== undefined && empleada.sedeId !== nuevaSede)) {
        setEmpleadaId('');
      }
    }
  };

  const alternarModulo = (id: number) => {
    const siguientes = moduloIds.includes(id)
      ? moduloIds.filter((moduloId) => moduloId !== id)
      : [...moduloIds, id];
    setModuloIds(siguientes);
    if (!todasCategorias) {
      const permitidas = new Set(
        categorias
          .filter((categoria) => siguientes.includes(categoria.moduloId))
          .map((categoria) => categoria.id),
      );
      setCategoriaIds((actuales) =>
        actuales.filter((categoriaId) => permitidas.has(categoriaId)),
      );
    }
  };

  const alternarSeccion = (id: SeccionReporte) => {
    const siguientes = secciones.includes(id)
      ? secciones.filter((seccion) => seccion !== id)
      : [...secciones, id];
    setSecciones(siguientes);
    if (!siguientes.includes('resumen')) setGraficos(false);
  };

  const descargar = async (formato: 'pdf' | 'excel') => {
    if (generando !== null || errorValidacion || cargandoCatalogos) return;
    setGenerando(formato);
    setMensaje('');
    try {
      const { contenido, nombre } = await api.exportarReporte({
        ...filtros,
        formato,
      });
      const url = URL.createObjectURL(contenido);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = nombre;
      document.body.appendChild(enlace);
      enlace.click();
      document.body.removeChild(enlace);
      URL.revokeObjectURL(url);
      setMensaje(
        `Reporte ${formato.toUpperCase()} descargado correctamente. Los datos se generaron con la información más reciente.`,
      );
    } catch (error) {
      setMensaje('');
      setErrorPreview(
        error instanceof Error
          ? error.message
          : 'No se pudo generar el reporte. Intente de nuevo.',
      );
    } finally {
      setGenerando(null);
    }
  };

  if (!isJefatura) return null;

  const nombresCategorias = new Map(
    categorias.map((categoria) => [categoria.id, categoria.nombre]),
  );

  return (
    <div className="w-full space-y-6" data-testid="reportes-vista">
      <div className="pb-4 border-b border-[#E3E1DA]">
        <h1 className="text-2xl font-medium text-[#262624] tracking-tight">
          Reportes y Exportables Institucionales
        </h1>
        <p className="text-sm text-[#6B6A64] mt-1">
          Armá el reporte, revisá la previsualización y descargalo en PDF o
          Excel con los mismos filtros.
        </p>
      </div>

      {errorCatalogos && (
        <div className="rounded-lg border border-[#F0B9BA] bg-[#FAE8E8] px-4 py-3 text-sm text-[#901012]">
          {errorCatalogos}
        </div>
      )}

      {/* 1. Alcance y período */}
      <section className="bg-white rounded-2xl border border-[#E3E1DA] p-6 shadow-xs space-y-4">
        <h2 className="text-base font-semibold text-[#262624]">
          1. Alcance y período
        </h2>

        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-[#585757] mb-1.5">
            Campus
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {(
              [
                ['ambas', 'Ambos campus', 'Nicoya + Liberia'],
                ['nicoya', 'Campus Nicoya', 'Biblioteca Nayuribe'],
                ['liberia', 'Campus Liberia', 'Rose Marie Ruiz Bravo'],
              ] as Array<[Alcance, string, string]>
            ).map(([id, titulo, detalle]) => (
              <label
                key={id}
                className={`flex cursor-pointer items-start gap-2 rounded-xl border p-3 transition-colors ${
                  alcance === id
                    ? 'border-[#990000] bg-[#990000]/5 ring-1 ring-[#990000]'
                    : 'border-[#E3E1DA] hover:border-[#990000]'
                }`}
              >
                <input
                  type="radio"
                  name="alcance-reporte"
                  value={id}
                  checked={alcance === id}
                  onChange={() => cambiarAlcance(id)}
                  className="mt-0.5 accent-[#990000]"
                />
                <span>
                  <span className="block text-sm font-semibold text-[#262624]">
                    {titulo}
                  </span>
                  <span className="block text-xs text-[#6B6A64]">{detalle}</span>
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-[#E3E1DA]">
          <label className="text-xs font-semibold uppercase tracking-wider text-[#585757]">
            Período
            <select
              value={tipoPeriodo}
              onChange={(event) =>
                setTipoPeriodo(event.target.value as TipoPeriodo)
              }
              className="mt-1.5 w-full rounded-lg border border-[#E3E1DA] bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-[#262624] outline-none focus:border-[#990000]"
            >
              <option value="ciclo">Ciclo lectivo</option>
              <option value="anio">Año lectivo</option>
              <option value="rango">Rango de fechas</option>
              <option value="todos">Todos los períodos</option>
            </select>
          </label>

          {tipoPeriodo === 'ciclo' && (
            <label className="text-xs font-semibold uppercase tracking-wider text-[#585757]">
              Ciclo
              <select
                value={cicloId}
                onChange={(event) =>
                  setCicloId(
                    event.target.value === '' ? '' : Number(event.target.value),
                  )
                }
                className="mt-1.5 w-full rounded-lg border border-[#E3E1DA] bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-[#262624] outline-none focus:border-[#990000]"
              >
                <option value="">Seleccione…</option>
                {ciclos.map((ciclo) => (
                  <option key={ciclo.id} value={ciclo.id}>
                    {nombreCiclo(ciclo)} ({ciclo.fechaInicio} — {ciclo.fechaFin})
                  </option>
                ))}
              </select>
            </label>
          )}

          {tipoPeriodo === 'anio' && (
            <label className="text-xs font-semibold uppercase tracking-wider text-[#585757]">
              Año
              <select
                value={anio}
                onChange={(event) =>
                  setAnio(
                    event.target.value === '' ? '' : Number(event.target.value),
                  )
                }
                className="mt-1.5 w-full rounded-lg border border-[#E3E1DA] bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-[#262624] outline-none focus:border-[#990000]"
              >
                <option value="">Seleccione…</option>
                {[...new Set<number>(ciclos.map((ciclo) => ciclo.anio))]
                  .sort((a, b) => a - b)
                  .map((valor) => (
                    <option key={valor} value={valor}>
                      Año {valor}
                    </option>
                  ))}
              </select>
            </label>
          )}

          {tipoPeriodo === 'rango' && (
            <>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#585757]">
                Desde
                <input
                  type="date"
                  value={desde}
                  onChange={(event) => setDesde(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#E3E1DA] bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-[#262624] outline-none focus:border-[#990000]"
                />
              </label>
              <label className="text-xs font-semibold uppercase tracking-wider text-[#585757]">
                Hasta
                <input
                  type="date"
                  value={hasta}
                  onChange={(event) => setHasta(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-[#E3E1DA] bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-[#262624] outline-none focus:border-[#990000]"
                />
              </label>
            </>
          )}
        </div>

        {tipoPeriodo === 'rango' && (
          <p className="text-xs text-[#6B6A64]">
            El rango usa la <strong>fecha de registro</strong> de cada atención,
            no la fecha del evento de la capacitación.
          </p>
        )}
      </section>

      {/* 2. Catálogo */}
      <section className="bg-white rounded-2xl border border-[#E3E1DA] p-6 shadow-xs space-y-4">
        <h2 className="text-base font-semibold text-[#262624]">
          2. Catálogo y personal
        </h2>

        <div>
          <span className="block text-xs font-semibold uppercase tracking-wider text-[#585757] mb-1.5">
            Módulos
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {modulos.map((modulo) => (
              <label
                key={modulo.id}
                className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#E3E1DA] px-3 py-2 text-sm text-[#262624] hover:border-[#990000]"
              >
                <input
                  type="checkbox"
                  checked={moduloIds.includes(modulo.id)}
                  onChange={() => alternarModulo(modulo.id)}
                  className="accent-[#990000]"
                />
                {modulo.nombre}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#585757]">
                Categorías y subcategorías
              </span>
              <label className="flex items-center gap-1.5 text-xs text-[#585757]">
                <input
                  type="checkbox"
                  checked={todasCategorias}
                  onChange={(event) => {
                    setTodasCategorias(event.target.checked);
                    if (event.target.checked) setCategoriaIds([]);
                  }}
                  className="accent-[#990000]"
                />
                Todas
              </label>
            </div>
            <input
              type="search"
              value={busquedaCategoria}
              onChange={(event) => setBusquedaCategoria(event.target.value)}
              placeholder="Buscar categoría…"
              disabled={todasCategorias}
              aria-label="Buscar categoría"
              className="w-full rounded-lg border border-[#E3E1DA] px-3 py-2 text-sm outline-none focus:border-[#990000] disabled:bg-[#F7F6F4] disabled:text-[#9A9893]"
            />
            <div className="mt-2 max-h-56 overflow-y-auto rounded-lg border border-[#E3E1DA] p-2">
              {categoriasVisibles.length === 0 ? (
                <p className="px-2 py-3 text-xs text-[#6B6A64]">
                  No hay categorías para los módulos seleccionados.
                </p>
              ) : (
                categoriasVisibles.map((categoria) => (
                  <label
                    key={categoria.id}
                    className={`flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs hover:bg-[#F7F6F4] ${
                      categoria.categoriaPadreId ? 'ml-4' : 'font-semibold'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={
                        todasCategorias || categoriaIds.includes(categoria.id)
                      }
                      disabled={todasCategorias}
                      onChange={() =>
                        setCategoriaIds((actuales) =>
                          actuales.includes(categoria.id)
                            ? actuales.filter((id) => id !== categoria.id)
                            : [...actuales, categoria.id],
                        )
                      }
                      className="accent-[#990000]"
                    />
                    {categoria.nombre}
                  </label>
                ))
              )}
            </div>
            {!todasCategorias && categoriaIds.length > 0 && (
              <p className="mt-1 text-[11px] text-[#6B6A64]">
                {categoriaIds.length} seleccionadas. Una categoría principal
                incluye sus subcategorías.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#585757]">
              Empleada (opcional)
              <select
                value={empleadaId}
                onChange={(event) => setEmpleadaId(event.target.value)}
                className="mt-1.5 w-full rounded-lg border border-[#E3E1DA] bg-white px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-[#262624] outline-none focus:border-[#990000]"
              >
                <option value="">Reporte institucional (todas)</option>
                {empleadas.map((empleada) => (
                  <option key={empleada.id} value={empleada.id}>
                    {empleada.nombreCompleto} · Campus{' '}
                    {NOMBRE_CAMPUS[empleada.sedeId] ?? empleada.sedeId}
                    {empleada.activo ? '' : ' (inactiva)'}
                  </option>
                ))}
              </select>
            </label>
            <p className="mt-2 text-xs text-[#6B6A64]">
              Con una empleada seleccionada se incluyen sus atenciones y las
              capacitaciones que recibió, aunque otra persona las haya
              registrado.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Contenido */}
      <section className="bg-white rounded-2xl border border-[#E3E1DA] p-6 shadow-xs space-y-4">
        <h2 className="text-base font-semibold text-[#262624]">
          3. Contenido del reporte
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {SECCIONES.map((seccion) => (
            <label
              key={seccion.id}
              className="flex cursor-pointer items-start gap-2 rounded-xl border border-[#E3E1DA] p-3 hover:border-[#990000]"
            >
              <input
                type="checkbox"
                checked={secciones.includes(seccion.id)}
                onChange={() => alternarSeccion(seccion.id)}
                className="mt-0.5 accent-[#990000]"
              />
              <span>
                <span className="block text-sm font-semibold text-[#262624]">
                  {seccion.titulo}
                </span>
                <span className="block text-xs text-[#6B6A64]">
                  {seccion.descripcion}
                </span>
              </span>
            </label>
          ))}
        </div>
        <div className="flex flex-wrap gap-5 pt-2 border-t border-[#E3E1DA]">
          <label className="flex items-center gap-2 text-sm text-[#262624]">
            <input
              type="checkbox"
              checked={graficos}
              disabled={!secciones.includes('resumen')}
              onChange={(event) => setGraficos(event.target.checked)}
              className="accent-[#990000]"
            />
            Incluir gráficos del resumen
          </label>
          <label className="flex items-center gap-2 text-sm text-[#262624]">
            <input
              type="checkbox"
              checked={membrete}
              onChange={(event) => setMembrete(event.target.checked)}
              className="accent-[#990000]"
            />
            Membrete institucional UNA
          </label>
        </div>
        {!secciones.includes('resumen') && (
          <p className="text-xs text-[#6B6A64]">
            Los gráficos requieren incluir la sección Resumen.
          </p>
        )}
      </section>

      {errorValidacion && (
        <div
          role="alert"
          data-testid="reportes-validacion"
          className="rounded-lg border border-[#F0B9BA] bg-[#FAE8E8] px-4 py-3 text-sm text-[#901012]"
        >
          {errorValidacion}
        </div>
      )}

      {/* 4. Previsualización */}
      <section className="bg-white rounded-2xl border border-[#E3E1DA] p-6 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-[#262624]">
            4. Previsualización
          </h2>
          {cargandoPreview && (
            <span className="text-xs text-[#6B6A64]">Actualizando…</span>
          )}
        </div>

        {errorPreview && !errorValidacion && (
          <div
            role="alert"
            data-testid="reportes-error"
            className="rounded-lg border border-[#F0B9BA] bg-[#FAE8E8] px-4 py-3 text-sm text-[#901012]"
          >
            {errorPreview}
          </div>
        )}

        {!preview && !cargandoPreview && !errorPreview && !errorValidacion && (
          <p className="text-sm text-[#6B6A64]">
            Elegí los filtros para ver el reporte antes de descargarlo.
          </p>
        )}

        {preview && (
          <div data-testid="reportes-preview" className="space-y-6">
            <div className="rounded-xl border border-[#E3E1DA] bg-[#F7F6F4] p-4">
              <p className="text-sm font-semibold text-[#262624]">
                {preview.meta.titulo}
              </p>
              <p className="mt-1 text-xs text-[#585757]">
                {preview.meta.campus} · {preview.meta.periodo} ·{' '}
                {preview.meta.generadoEl}
              </p>
              <p className="mt-1 text-[11px] text-[#6B6A64]">
                {preview.meta.filtros.join(' · ')}
              </p>
              {preview.meta.nota && (
                <p className="mt-2 text-[11px] italic text-[#034991]">
                  {preview.meta.nota}
                </p>
              )}
            </div>

            {preview.resumen && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    ['Atenciones', preview.resumen.cantidad.toLocaleString()],
                    ['Personas', preview.resumen.personas.toLocaleString()],
                    ['Tiempo', minutos(preview.resumen.minutos)],
                    ['Registros', preview.resumen.registros.toLocaleString()],
                  ].map(([etiqueta, valor]) => (
                    <div
                      key={etiqueta}
                      className="rounded-xl border border-[#E3E1DA] p-4"
                    >
                      <span className="text-xs uppercase tracking-wider text-[#585757]">
                        {etiqueta}
                      </span>
                      <p className="mt-1 font-mono text-2xl font-bold text-[#990000]">
                        {valor}
                      </p>
                    </div>
                  ))}
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold text-[#262624]">
                    Resumen por módulo
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#990000] text-white">
                        <tr>
                          <Th>Módulo</Th>
                          <Th className="text-right">Atenciones</Th>
                          <Th className="text-right">Personas</Th>
                          <Th className="text-right">Tiempo</Th>
                          <Th className="text-right">Participación</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.resumen.porModulo.map((fila) => (
                          <tr
                            key={fila.moduloId}
                            className="border-b border-[#E3E1DA]"
                          >
                            <Td>{fila.modulo}</Td>
                            <Td className="text-right font-mono">
                              {fila.cantidad.toLocaleString()}
                            </Td>
                            <Td className="text-right font-mono">
                              {fila.personas.toLocaleString()}
                            </Td>
                            <Td className="text-right font-mono">
                              {minutos(fila.minutos)}
                            </Td>
                            <Td className="text-right font-mono">
                              {fila.porcentaje.toFixed(1)}%
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {preview.graficos && (
                  <div>
                    <h3 className="mb-2 text-sm font-semibold text-[#262624]">
                      Gráficos del resumen
                    </h3>
                    <div className="space-y-2">
                      {preview.resumen.porModulo.map((fila, indice) => (
                        <div key={`grafico-${fila.moduloId}`}>
                          <div className="mb-1 flex items-center justify-between gap-2 text-xs text-[#585757]">
                            <span>{fila.modulo}</span>
                            <span className="font-mono">
                              {fila.cantidad.toLocaleString()} ·{' '}
                              {fila.porcentaje.toFixed(1)}%
                            </span>
                          </div>
                          <div
                            className="h-3 w-full overflow-hidden rounded bg-[#F2F0EC]"
                            role="img"
                            aria-label={`${fila.modulo}: ${fila.cantidad} atenciones, ${fila.porcentaje.toFixed(1)}%`}
                          >
                            <div
                              className={`h-full rounded ${
                                indice % 2 === 0 ? 'bg-[#990000]' : 'bg-[#034991]'
                              }`}
                              style={{
                                width: `${Math.max(fila.porcentaje, 1)}%`,
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {preview.modulos && (
              <div className="space-y-5">
                <h3 className="text-sm font-semibold text-[#262624]">
                  Detalle por módulo
                </h3>
                {preview.modulos.map((bloque) => (
                  <div key={`modulo-${bloque.moduloId}`}>
                    <h4 className="mb-1 text-xs font-bold uppercase tracking-wider text-[#990000]">
                      {bloque.modulo}
                    </h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-[#F7F6F4]">
                          <tr>
                            <Th>Categoría padre</Th>
                            <Th>Categoría / Subcategoría</Th>
                            <Th>Métrica</Th>
                            <Th className="text-right">Cantidad</Th>
                            <Th className="text-right">Personas</Th>
                            <Th className="text-right">Tiempo</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {bloque.filas.map((fila) => (
                            <tr
                              key={`${fila.moduloId}-${fila.categoriaId}`}
                              className="border-b border-[#E3E1DA]"
                            >
                              <Td>{fila.categoriaPadre || '—'}</Td>
                              <Td className="font-medium">{fila.categoria}</Td>
                              <Td>{fila.tipo}</Td>
                              <Td className="text-right font-mono">
                                {fila.cantidad.toLocaleString()}
                              </Td>
                              <Td className="text-right font-mono">
                                {fila.personas > 0
                                  ? fila.personas.toLocaleString()
                                  : '—'}
                              </Td>
                              <Td className="text-right font-mono">
                                {minutos(fila.minutos)}
                              </Td>
                            </tr>
                          ))}
                          <tr className="bg-[#F7F6F4] font-semibold">
                            <Td>Subtotal {bloque.modulo}</Td>
                            <Td />
                            <Td />
                            <Td className="text-right font-mono">
                              {bloque.cantidad.toLocaleString()}
                            </Td>
                            <Td className="text-right font-mono">
                              {bloque.personas.toLocaleString()}
                            </Td>
                            <Td className="text-right font-mono">
                              {minutos(bloque.minutos)}
                            </Td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {preview.detallePoa && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-[#262624]">
                  POA — Metas y evidencias
                </h3>
                {preview.detallePoa.length === 0 ? (
                  <p className="text-xs text-[#6B6A64]">
                    Sin metas ni evidencias en el período.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#F7F6F4]">
                        <tr>
                          <Th>Categoría</Th>
                          <Th>Meta</Th>
                          <Th>Evidencia</Th>
                          <Th className="text-right">Renglones</Th>
                          <Th>Fecha</Th>
                          <Th>Registrada por</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.detallePoa.map((fila, indice) => (
                          <tr
                            key={`poa-${indice}`}
                            className="border-b border-[#E3E1DA]"
                          >
                            <Td>{fila.categoria}</Td>
                            <Td>{fila.meta}</Td>
                            <Td className="break-all">{fila.evidencia}</Td>
                            <Td className="text-right font-mono">
                              {fila.cantidad}
                            </Td>
                            <Td>{fechaLegible(fila.fecha)}</Td>
                            <Td>{fila.autor}</Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {preview.detalleCapacitaciones && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-[#262624]">
                  Desarrollo Profesional — Capacitaciones
                </h3>
                {preview.detalleCapacitaciones.length === 0 ? (
                  <p className="text-xs text-[#6B6A64]">
                    Sin capacitaciones en el período.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#F7F6F4]">
                        <tr>
                          <Th>Capacitación</Th>
                          <Th>Expositor</Th>
                          <Th>Fecha</Th>
                          <Th className="text-right">Duración</Th>
                          <Th>Empleados</Th>
                          <Th className="text-right">Total</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.detalleCapacitaciones.map((fila, indice) => (
                          <tr
                            key={`capacitacion-${indice}`}
                            className="border-b border-[#E3E1DA]"
                          >
                            <Td className="font-medium">{fila.capacitacion}</Td>
                            <Td>{fila.expositor}</Td>
                            <Td>{fechaLegible(fila.fecha)}</Td>
                            <Td className="text-right font-mono">
                              {minutos(fila.duracionMinutos)}
                            </Td>
                            <Td>{fila.empleados.join(', ') || '—'}</Td>
                            <Td className="text-right font-mono">
                              {fila.asistentes}
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {preview.personal && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-[#262624]">
                  Personal — {preview.personal.titulo}
                </h3>
                {preview.personal.modo === 'ranking' && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-[#F7F6F4]">
                        <tr>
                          <Th>Empleada</Th>
                          {preview.personal.consolidado && <Th>Campus</Th>}
                          <Th className="text-right">Atenciones</Th>
                          <Th className="text-right">Personas</Th>
                          <Th className="text-right">Tiempo</Th>
                          <Th className="text-right">Registros</Th>
                          <Th className="text-right">Capacitaciones</Th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.personal.ranking.map((fila) => (
                          <tr
                            key={fila.empleado}
                            className="border-b border-[#E3E1DA]"
                          >
                            <Td className="font-medium">{fila.empleado}</Td>
                            {preview.personal!.consolidado && (
                              <Td>{fila.campus ?? '—'}</Td>
                            )}
                            <Td className="text-right font-mono">
                              {fila.atenciones.toLocaleString()}
                            </Td>
                            <Td className="text-right font-mono">
                              {fila.personas.toLocaleString()}
                            </Td>
                            <Td className="text-right font-mono">
                              {minutos(fila.minutos)}
                            </Td>
                            <Td className="text-right font-mono">
                              {fila.registros}
                            </Td>
                            <Td className="text-right font-mono">
                              {fila.eventos}
                            </Td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-[#F7F6F4]">
                      <tr>
                        <Th>Empleada</Th>
                        {preview.personal.consolidado && <Th>Campus</Th>}
                        <Th>Categoría / Subcategoría</Th>
                        <Th>Módulo</Th>
                        <Th className="text-right">Cantidad</Th>
                        <Th className="text-right">Personas</Th>
                        <Th className="text-right">Tiempo</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.personal.desglose.length === 0 ? (
                        <tr>
                          <Td>Sin registros de personal en el período.</Td>
                        </tr>
                      ) : (
                        preview.personal.desglose.map((fila, indice) => (
                          <tr
                            key={`personal-${indice}`}
                            className="border-b border-[#E3E1DA]"
                          >
                            <Td className="font-medium">{fila.empleado}</Td>
                            {preview.personal!.consolidado && (
                              <Td>{fila.campus ?? '—'}</Td>
                            )}
                            <Td>{fila.categoria}</Td>
                            <Td>{fila.modulo}</Td>
                            <Td className="text-right font-mono">
                              {fila.cantidad}
                            </Td>
                            <Td className="text-right font-mono">
                              {fila.personas > 0 ? fila.personas : '—'}
                            </Td>
                            <Td className="text-right font-mono">
                              {minutos(fila.minutos)}
                            </Td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>

      {/* 5. Descarga */}
      <section className="bg-white rounded-2xl border border-[#E3E1DA] p-6 shadow-xs space-y-3">
        <h2 className="text-base font-semibold text-[#262624]">
          5. Descargar
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => descargar('pdf')}
            disabled={
              cargandoCatalogos || Boolean(errorValidacion) || generando !== null
            }
            className="rounded-lg bg-[#990000] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#CD1719] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {generando === 'pdf' ? 'Generando PDF…' : 'Descargar PDF'}
          </button>
          <button
            type="button"
            onClick={() => descargar('excel')}
            disabled={
              cargandoCatalogos || Boolean(errorValidacion) || generando !== null
            }
            className="rounded-lg bg-[#034991] px-5 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#356DA7] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {generando === 'excel' ? 'Generando Excel…' : 'Descargar Excel'}
          </button>
          <span className="text-xs text-[#6B6A64]">
            {nombresCategorias.size > 0 && !todasCategorias
              ? `${categoriaIds.length} categorías seleccionadas`
              : 'Todos los registros de los filtros elegidos'}
          </span>
        </div>
        {mensaje && (
          <div
            data-testid="reportes-exito"
            className="rounded-lg border border-[#9AB6D3] bg-[#E6EDF4] px-4 py-3 text-sm text-[#023366]"
          >
            {mensaje}
          </div>
        )}
      </section>
    </div>
  );
};
