import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { CAMPUSES } from '../data/campuses';
import { api } from '../api/client';
import { formatearDuracion } from '../utils/duracion';
import {
  AttendanceRecord,
  CampusId,
  CategoriaDto,
  CicloDto,
  ModuloDto,
  UsuarioBasicoDto,
  UserSession,
} from '../types';
import { GestionCapacitaciones } from './GestionCapacitaciones';
import { SelectorAsistentes } from './SelectorAsistentes';
import { MODULO_DESCARROLLO_PERSONAL } from '../data/modulos';

interface QuickRegisterViewProps {
  session: UserSession;
}

export const QuickRegisterView: React.FC<QuickRegisterViewProps> = ({ session }) => {
  const campus = CAMPUSES[session.campus];
  // La jefa ve el historial de ambos campus (el backend no la restringe);
  // la bibliotecóloga solo el de su sede.
  const esJefatura = session.role === 'jefa' || (session.role as string) === 'jefatura';
  const nombreAlcanceHistorial = esJefatura ? 'ambos campus' : campus.libraryName;

  const [modulos, setModulos] = useState<ModuloDto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaDto[]>([]);
  const [ciclos, setCiclos] = useState<CicloDto[]>([]);
  const [cicloActual, setCicloActual] = useState<CicloDto | null>(null);

  const [moduloId, setModuloId] = useState<number | null>(null);
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [subcategoriaId, setSubcategoriaId] = useState<number | null>(null);
  const [cicloId, setCicloId] = useState<number | null>(null);
  const [count, setCount] = useState<number>(1);
  const [cantidadSecundaria, setCantidadSecundaria] = useState<string>('');
  const [tiempo, setTiempo] = useState<string>('');
  const [notes, setNotes] = useState('');
  // POA: texto libre de la meta y enlace de la evidencia.
  const [meta, setMeta] = useState('');
  const [evidencia, setEvidencia] = useState('');
  // Desarrollo Personal: empleados que recibieron la capacitación.
  const [asistentes, setAsistentes] = useState<string[]>([]);
  const [usuariosBasicos, setUsuariosBasicos] = useState<UsuarioBasicoDto[]>([]);
  // Capacitación que se está editando en el modal del cuadro de gestión.
  const [capacitacionEnEdicion, setCapacitacionEnEdicion] =
    useState<CategoriaDto | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [pagina, setPagina] = useState(1);
  const POR_PAGINA = 5;
  const totalPaginas = Math.max(1, Math.ceil(records.length / POR_PAGINA));
  const paginaSegura = Math.min(pagina, totalPaginas);
  const visibles = records.slice(
    (paginaSegura - 1) * POR_PAGINA,
    paginaSegura * POR_PAGINA,
  );
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  /**
   * Bloqueo síncrono de envío: `setIsLoading` no se aplica hasta el siguiente
   * render, así que clics muy seguidos crearían el mismo registro varias veces
   * (y la página "se trababa" mientras respondía el backend).
   */
  const enviandoRef = useRef(false);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Una categoría puede reservar su registro a la jefatura (POA · Metas), así
   * que la bibliotecóloga no debe verla: el backend también rechazaría su
   * registro, esto evita ofrecerle una acción que va a fallar.
   */
  const puedeRegistrar = (categoria: CategoriaDto) =>
    esJefatura || categoria.permisoCreacion !== 'jefa';

  // La categoría raíz elegida en el paso 2 y, si existe, la subcategoría del paso 3.
  const categoriaRaizSeleccionada = categorias.find((c) => c.id === categoriaId);
  const subcategoriasDeCategoria =
    categoriaId == null
      ? []
      : categorias.filter(
          (c) =>
            c.activo && c.categoriaPadreId === categoriaId && puedeRegistrar(c),
        );
  const subcategoriaSeleccionada = categorias.find((c) => c.id === subcategoriaId);
  const categoriaSeleccionada = subcategoriaSeleccionada ?? categoriaRaizSeleccionada;
  // Nivel más específico que se envía al backend.
  const categoriaEfectivaId = subcategoriaSeleccionada
    ? subcategoriaSeleccionada.id
    : categoriaId;

  const metrica = categoriaSeleccionada?.tipoMetrica ?? null;
  const esMetas = metrica === 'metas';
  const esEvidencia = metrica === 'evidencia';
  // POA pide texto (y enlace en Evidencia), no números.
  const esPoa = esMetas || esEvidencia;
  // Desarrollo Personal pide la lista de empleados; la fecha y la duración ya
  // vinieron de la capacitación creada.
  const esAsistentes = metrica === 'asistentes';

  const etiquetaMetrica = (tipo: CategoriaDto['tipoMetrica']): string => {
    switch (tipo) {
      case 'triple':
        return 'Cantidad + Personas + Tiempo';
      case 'doble':
        return 'Cantidad + Personas';
      case 'asistentes':
        return 'Evento + Asistentes';
      case 'metas':
        return 'Meta (texto libre)';
      case 'evidencia':
        return 'Meta + Evidencia (enlace)';
      default:
        return 'Cantidad';
    }
  };

  // Se muestran todos los módulos, no solo los que ya tienen categorías:
  // Desarrollo Personal puede no tener ninguna capacitación creada y aun así
  // debe ofrecerse, porque es donde la jefatura crea la primera.
  const modulosVisibles = modulos;

  // Categorías raíz visibles (las subcategorías se eligen en el paso 3).
  const categoriasRaizDelModulo = categorias.filter(
    (c) =>
      c.activo &&
      c.moduloId === moduloId &&
      c.categoriaPadreId == null &&
      puedeRegistrar(c),
  );

  // Con una categoría elegida el resto se colapsa (queda solo la elegida);
  // al tocar la elegida de nuevo, vuelven a aparecer para cambiar de servicio.
  const categoriasVisibles =
    categoriaId == null
      ? categoriasRaizDelModulo
      : categoriasRaizDelModulo.filter((c) => c.id === categoriaId);

  const reducirMovimiento = useReducedMotion();
  const transicion = {
    duration: reducirMovimiento ? 0 : 0.18,
    ease: [0.23, 1, 0.32, 1] as const,
  };
  const entrada = reducirMovimiento
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.96 };
  const salida = reducirMovimiento
    ? { opacity: 0 }
    : { opacity: 0, scale: 0.96 };

  useEffect(() => {
    let mounted = true;
    Promise.all([api.categorias(), api.ciclos(), api.modulos()])
      .then(([cats, cic, mods]) => {
        if (!mounted) return;
        setCategorias(cats);
        setCiclos(cic);
        setModulos(mods);
        // Solo cae al primer ciclo si `cicloActual` aún no respondió: esa
        // petición corre en paralelo y debe ganar (evita registrar en el
        // ciclo equivocado por una carrera de red).
        setCicloId((prev) =>
          prev === null && cic.length > 0 ? cic[0].id : prev,
        );
      })
      .catch(() => {
        if (mounted) setErrorMsg('No se pudieron cargar las categorías o ciclos.');
      });

    api
      .cicloActual()
      .then((ciclo) => {
        if (mounted) {
          setCicloActual(ciclo);
          setCicloId(ciclo.id);
        }
      })
      .catch(() => {
        /* sin ciclo configurado */
      });

    api
      .registros({ limit: 20 })
      .then((res) => {
        if (!mounted) return;
        const mapped: AttendanceRecord[] = res.data.map((r) => ({
          id: r.id,
          date: new Date(r.fechaHora).toLocaleDateString('es-CR'),
          time: new Date(r.fechaHora).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          }),
          serviceType: r.categoria?.nombre ?? `Categoría ${r.categoriaId}`,
          userType: r.meta
            ? `Meta: ${r.meta}`
            : r.cantidadTerciaria != null
              ? `${r.cantidadSecundaria ?? 0} personas · ${formatearDuracion(r.cantidadTerciaria)}`
              : r.cantidadSecundaria
                ? `${r.cantidadSecundaria} personas atendidas`
                : 'Atención directa',
          count: r.cantidad,
          campus: r.sedeId === 1 ? 'nicoya' : 'liberia',
          registeredBy: r.usuario?.nombreCompleto ?? session.name,
          notes: r.observaciones ?? undefined,
        }));
        setRecords(mapped);
      })
      .catch(() => {
        /* sin registros */
      });

    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // El listado de posibles asistentes solo hace falta en Desarrollo Personal.
  useEffect(() => {
    if (moduloId !== MODULO_DESCARROLLO_PERSONAL) return;
    let mounted = true;
    api
      .usuariosBasicos()
      .then((usuarios) => {
        if (mounted) setUsuariosBasicos(usuarios);
      })
      .catch(() => {
        if (mounted) setUsuariosBasicos([]);
      });
    return () => {
      mounted = false;
    };
  }, [moduloId]);

  /** Recarga el catálogo después de crear o editar una capacitación. */
  const recargarCategorias = async () => {
    try {
      setCategorias(await api.categorias());
    } catch {
      setErrorMsg('No se pudo recargar el catálogo.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    // En Desarrollo Personal el ciclo no se elige: lo deriva el backend de la
    // fecha de la capacitación.
    if (!categoriaId || (!esAsistentes && !cicloId)) {
      setErrorMsg('Seleccione una categoría y un ciclo lectivo.');
      return;
    }
    if (subcategoriasDeCategoria.length > 0 && !subcategoriaId) {
      setErrorMsg('Seleccione una subcategoría de la categoría elegida.');
      return;
    }
    if (esPoa && !meta.trim()) {
      setErrorMsg('Indique la meta del renglón.');
      return;
    }
    if (esEvidencia && !evidencia.trim()) {
      setErrorMsg('Indique el enlace de la evidencia.');
      return;
    }
    if (esAsistentes && asistentes.length === 0) {
      setErrorMsg(
        'Seleccione al menos un empleado que haya recibido la capacitación.',
      );
      return;
    }
    if (
      !esPoa &&
      !esAsistentes &&
      metrica !== 'simple' &&
      !cantidadSecundaria.trim()
    ) {
      setErrorMsg('Indique la cantidad de personas atendidas.');
      return;
    }
    if (metrica === 'triple' && !tiempo.trim()) {
      setErrorMsg('Indique el tiempo con formato horas:minutos (ej. 1:30).');
      return;
    }

    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setIsLoading(true);
    try {
      await api.crearRegistro({
        categoriaId: categoriaEfectivaId as number,
        ...(esAsistentes ? {} : { cicloId: cicloId as number }),
        cantidad: esAsistentes ? 1 : Math.max(1, count),
        cantidadSecundaria:
          metrica === 'doble' || metrica === 'triple'
            ? cantidadSecundaria
              ? Number(cantidadSecundaria)
              : undefined
            : undefined,
        cantidadTerciaria: metrica === 'triple' ? tiempo.trim() : undefined,
        observaciones: notes.trim() || undefined,
        ...(esPoa
          ? {
              meta: meta.trim(),
              ...(esEvidencia ? { evidencia: evidencia.trim() } : {}),
            }
          : {}),
        ...(esAsistentes ? { asistentes } : {}),
        // La jefa envía la sede donde está (sesión); el backend la valida y
        // la usa. La bibliotecóloga nunca la envía: cae en su sede del JWT.
        ...(esJefatura ? { sedeId: session.campusId } : {}),
      });

      const nuevoRecord: AttendanceRecord = {
        id: `rec-${Date.now()}`,
        date: new Date().toLocaleDateString('es-CR'),
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        serviceType: categoriaSeleccionada?.nombre ?? '',
        userType: esAsistentes
          ? `${asistentes.length} empleados`
          : esPoa
            ? `Meta: ${meta.trim()}`
            : metrica === 'triple'
              ? `${cantidadSecundaria || 0} personas · ${tiempo}`
              : metrica === 'doble'
                ? `${cantidadSecundaria || 0} personas atendidas`
                : 'Atención directa',
        // Un registro de asistencia es UN evento con N personas: el historial
        // muestra las personas en `userType`, así que el contador es 1.
        count: esAsistentes ? 1 : Math.max(1, count),
        campus: session.campus,
        registeredBy: session.name,
        notes: notes.trim(),
      };

      setRecords([nuevoRecord, ...records]);
      setPagina(1);
      setSuccessMsg(
        `✓ Registro guardado correctamente (${categoriaSeleccionada?.nombre} — ${
          esAsistentes ? `${asistentes.length} empleados` : count
        } · Campus ${campus.name}).`,
      );
      setNotes('');
      setCount(1);
      setCantidadSecundaria('');
      setTiempo('');
      setMeta('');
      setEvidencia('');
      setAsistentes([]);
      setSubcategoriaId(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar.';
      setErrorMsg(message || 'No se pudo guardar el registro.');
    } finally {
      enviandoRef.current = false;
      setIsLoading(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="pb-4 border-b border-[#E3E1DA]">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-bold uppercase tracking-wider text-[#990000] bg-[#990000]/10 px-2 py-0.5 rounded">
            {campus.libraryName}
          </span>
          <span className="text-xs text-[#6B6A64]">Campus {campus.name}</span>
        </div>
        <h1 className="text-2xl font-medium text-[#262624] tracking-tight">
          Registro Rápido de Atenciones
        </h1>
        <p className="text-sm text-[#6B6A64] mt-1">
          Formulario cotidiano para guardar atenciones en ventanilla y servicios brindados.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Card (2 cols) */}
        <div className="lg:col-span-2 bg-white border border-[#E3E1DA] rounded-2xl p-6 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-[#E3E1DA]">
            <h2 className="text-base font-semibold text-[#262624] font-goudy">
              + Nueva Atención en Ventanilla
            </h2>
            <span className="text-xs text-[#6B6A64]">
              {cicloActual
                ? `Ciclo actual: ${cicloActual.numero === 1 ? 'I' : 'II'} ${cicloActual.anio}`
                : 'Bibliotecóloga:'}{' '}
              <strong className="text-[#262624]">{session.name}</strong>
            </span>
          </div>

          {/* Destino del registro = campus donde estás (sesión). La jefa entra
              por la tarjeta de un campus y ahí se guarda (envía su sedeId, el
              backend solo se lo acepta a ella); la bibliotecóloga siempre cae
              en su sede del JWT. */}
          <p className="text-xs text-[#585757] bg-[#F7F6F4] border border-[#E3E1DA] rounded-lg px-3 py-2">
            Estás en: <strong className="text-[#990000]">Campus {campus.name} — {campus.libraryName}</strong>
            {' '}y aquí se guardará este registro.
          </p>

          {successMsg && (
            <div className="p-3 bg-[#E6EDF4] border border-[#9AB6D3] text-[#023366] text-xs rounded-lg flex items-center justify-between">
              <span>{successMsg}</span>
              <span className="text-[10px] uppercase font-bold text-[#034991]">Guardado</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-[#FAE8E8] border border-[#F0B9BA] text-[#901012] text-xs rounded-lg">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Ciclo Lectivo */}
            {esAsistentes ? (
              <div>
                <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-2">
                  Ciclo Lectivo
                </label>
                <p className="px-3.5 py-2.5 rounded-lg border border-[#E3E1DA] bg-[#F7F6F4] text-xs text-[#585757]">
                  Se asigna automáticamente según la fecha de la capacitación.
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-2">
                  Ciclo Lectivo <span className="text-[#990000]">*</span>
                </label>
                <select
                  value={cicloId ?? ''}
                  onChange={(e) => setCicloId(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E1DA] focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none text-sm bg-white"
                >
                  {ciclos.map((ciclo) => (
                    <option key={ciclo.id} value={ciclo.id}>
                      {ciclo.numero === 1 ? 'I' : 'II'} Ciclo Lectivo {ciclo.anio} ({ciclo.fechaInicio} — {ciclo.fechaFin})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Module Selection */}
            <div>
              <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-2">
                1. Módulo de Servicio <span className="text-[#990000]">*</span>
              </label>
              {modulosVisibles.length === 0 ? (
                <p className="text-xs text-[#6B6A64] italic">
                  No hay módulos disponibles.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {modulosVisibles.map((mod) => (
                    <button
                      type="button"
                      key={mod.id}
                      onClick={() => {
                        setModuloId(mod.id);
                        setCategoriaId(null);
                        setSubcategoriaId(null);
                        setTiempo('');
                      }}
                      className={`px-4 py-2 rounded-lg text-xs font-medium border transition-colors ${
                        moduloId === mod.id
                          ? 'border-[#990000] bg-[#990000]/10 text-[#990000] font-semibold'
                          : 'border-[#E3E1DA] bg-white text-[#262624] hover:border-[#990000]'
                      }`}
                    >
                      {mod.nombre}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Category Selection (filtered by selected module) */}
            <div>
              <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-2">
                2. Categoría de Servicio <span className="text-[#990000]">*</span>
              </label>
              {moduloId === null ? (
                <p className="text-xs text-[#6B6A64] italic px-1 py-3 bg-[#F7F6F4] rounded-lg">
                  Seleccioná primero un módulo para ver sus categorías.
                </p>
              ) : categoriasRaizDelModulo.length === 0 ? (
                <p className="text-xs text-[#6B6A64] italic px-1 py-3 bg-[#F7F6F4] rounded-lg">
                  Este módulo no tiene categorías activas.
                </p>
              ) : (
                <div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                    <AnimatePresence initial={false} mode="popLayout">
                      {categoriasVisibles.map((cat) => (
                        <motion.button
                          type="button"
                          key={cat.id}
                          layout
                          initial={entrada}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={salida}
                          transition={transicion}
                          aria-pressed={categoriaId === cat.id}
                          onClick={() => {
                            // Tocar la categoría elegida la deselecciona y
                            // vuelve a mostrar el resto.
                            const esMisma = categoriaId === cat.id;
                            setCategoriaId(esMisma ? null : cat.id);
                            setSubcategoriaId(null);
                            setTiempo('');
                          }}
                          className={`p-3 rounded-lg text-xs text-left font-medium border transition-colors ${
                            categoriaId === cat.id
                              ? 'border-[#990000] bg-[#990000]/10 text-[#990000] font-semibold shadow-xs'
                              : 'border-[#E3E1DA] bg-white text-[#262624] hover:border-[#990000]'
                          }`}
                        >
                          <span className="block font-semibold">{cat.nombre}</span>
                          <span className="text-[10px] text-[#6B6A64] block mt-0.5">
                            {etiquetaMetrica(cat.tipoMetrica)}
                          </span>
                        </motion.button>
                      ))}
                    </AnimatePresence>
                  </div>
                  {categoriaId != null && (
                    <p className="text-[10px] text-[#6B6A64] mt-2">
                      Tocá la categoría de nuevo para ver las demás.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Subcategory Selection (only when the category has children) */}
            {subcategoriasDeCategoria.length > 0 && (
              <motion.div
                initial={entrada}
                animate={{ opacity: 1, scale: 1 }}
                transition={transicion}
              >
                <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-2">
                  3. Subcategoría de Servicio <span className="text-[#990000]">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {subcategoriasDeCategoria.map((sub) => (
                    <button
                      type="button"
                      key={sub.id}
                      onClick={() => setSubcategoriaId(sub.id)}
                      className={`p-3 rounded-lg text-xs text-left font-medium border transition-colors ${
                        subcategoriaId === sub.id
                          ? 'border-[#990000] bg-[#990000]/10 text-[#990000] font-semibold'
                          : 'border-[#E3E1DA] bg-white text-[#262624] hover:border-[#990000]'
                      }`}
                    >
                      <span className="block font-semibold">{sub.nombre}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Capacitación elegida: sus datos fijados y el acceso a editarlos,
                arriba de los campos de registro para no tener que bajar. */}
            {esAsistentes && categoriaSeleccionada && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#E3E1DA] bg-[#F7F6F4] px-3 py-2">
                <span className="text-xs text-[#585757] min-w-0">
                  <strong className="text-[#262624]">
                    {categoriaSeleccionada.nombre}
                  </strong>{' '}
                  · {categoriaSeleccionada.expositor ?? '—'} ·{' '}
                  {categoriaSeleccionada.institucion ?? '—'} ·{' '}
                  {categoriaSeleccionada.duracionMinutos != null
                    ? formatearDuracion(categoriaSeleccionada.duracionMinutos)
                    : '—'}{' '}
                  · {categoriaSeleccionada.fechaEvento?.slice(0, 10) ?? '—'}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCapacitacionEnEdicion(categoriaSeleccionada)
                  }
                  data-testid="editar-capacitacion"
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg border border-[#034991]/40 bg-white px-3 py-1.5 text-xs font-semibold text-[#034991] transition-colors hover:bg-[#E6EDF4] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#034991] focus-visible:ring-offset-1"
                >
                  Editar capacitación
                </button>
              </div>
            )}

            {/* Cuadrito "+ Agregar capacitación": solo la jefatura y solo en
                Desarrollo Personal, junto a las capacitaciones. Su modal se
                dibuja en un portal, así que este bloque puede vivir dentro del
                <form> de registro sin crear un <form> anidado. */}
            {esJefatura && moduloId === MODULO_DESCARROLLO_PERSONAL && (
              <GestionCapacitaciones
                moduloId={MODULO_DESCARROLLO_PERSONAL}
                onCambio={recargarCategorias}
                capacitacionEnEdicion={capacitacionEnEdicion}
                onEdicionTerminada={() => setCapacitacionEnEdicion(null)}
              />
            )}

            {/* Count & Notes Grid */}
            {!esAsistentes && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {!esPoa && (
                <div>
                  <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5">
                    Cantidad <span className="text-[#990000]">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    value={count}
                    onChange={(e) => setCount(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E1DA] focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none text-sm font-mono"
                  />
                </div>
              )}

              {esPoa && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5">
                    Meta <span className="text-[#990000]">*</span>
                  </label>
                  <input
                    type="text"
                    value={meta}
                    onChange={(e) => setMeta(e.target.value)}
                    placeholder="Ej. Semana del Libro"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E1DA] focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none text-sm"
                  />
                </div>
              )}

              {esEvidencia && (
                <div>
                  <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5">
                    Evidencia (enlace) <span className="text-[#990000]">*</span>
                  </label>
                  <input
                    type="text"
                    value={evidencia}
                    onChange={(e) => setEvidencia(e.target.value)}
                    placeholder="Ej. https://una.cr/album"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E1DA] focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none text-sm"
                  />
                </div>
              )}

              {(metrica === 'doble' || metrica === 'triple') && (
                <div>
                  <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5">
                    Personas Atendidas <span className="text-[#990000]">*</span>
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={cantidadSecundaria}
                    onChange={(e) => setCantidadSecundaria(e.target.value)}
                    placeholder="Ej. 20"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E1DA] focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none text-sm font-mono"
                  />
                </div>
              )}

              {metrica === 'triple' && (
                <div>
                  <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5">
                    Tiempo (hh:mm) <span className="text-[#990000]">*</span>
                  </label>
                  <input
                    type="text"
                    value={tiempo}
                    onChange={(e) => setTiempo(e.target.value)}
                    placeholder="Ej. 1:30"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E1DA] focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none text-sm font-mono"
                  />
                </div>
              )}

              <div className={!esPoa && metrica !== 'simple' && metrica !== null ? '' : 'sm:col-span-2'}>
                <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5">
                  Observaciones (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ej. Búsqueda de tesis o préstamo interbibliotecario"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E1DA] focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none text-sm"
                />
              </div>
            </div>
            )}

            {/* Desarrollo Personal: se elige quién la recibió. Sin cantidad,
                fecha ni duración: ya vienen de la capacitación creada. */}
            {esAsistentes && (
              <div className="space-y-4">
                <SelectorAsistentes
                  usuarios={usuariosBasicos}
                  seleccionados={asistentes}
                  onChange={setAsistentes}
                />
                <div>
                  <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5">
                    Observaciones (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. Segunda cohorte del mismo taller"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E1DA] focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none text-sm"
                  />
                </div>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 bg-[#990000] hover:bg-[#CD1719] text-white font-medium text-sm rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {isLoading ? 'Guardando...' : '+ Guardar Registro de Atención'}
            </button>
          </form>
        </div>

        {/* Recent History Side Card (1 col) */}
        <div className="bg-white border border-[#E3E1DA] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#262624] uppercase tracking-wider mb-3">
              Registros Recientes
            </h3>
            <p className="text-xs text-[#6B6A64] mb-4">
              Historial de las últimas atenciones registradas en {nombreAlcanceHistorial}:
            </p>

            {records.length === 0 ? (
              <p className="text-xs text-[#6B6A64] italic">
                Todavía no hay registros para mostrar.
              </p>
            ) : (
              <div className="space-y-3">
                {visibles.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-xl border border-[#E3E1DA] bg-[#F7F6F4]/50 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-semibold text-[#262624]">
                      <span>{rec.serviceType}</span>
                      <span className="font-mono text-[#990000]">{rec.time}</span>
                    </div>
                    <div className="text-[#585757] flex justify-between">
                      <span>{rec.userType}</span>
                      <span className="font-bold">x{rec.count}</span>
                    </div>
                    {rec.notes && <p className="text-[11px] text-[#6B6A64] italic pt-1">"{rec.notes}"</p>}
                  </div>
                ))}
                {records.length > POR_PAGINA && (
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => setPagina((p) => Math.max(1, p - 1))}
                      disabled={paginaSegura === 1}
                      className="px-3 py-1.5 text-xs font-semibold text-[#990000] rounded-lg hover:bg-[#990000]/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#990000]"
                    >
                      ← Anterior
                    </button>
                    <span className="text-[11px] text-[#6B6A64] font-mono">
                      Página {paginaSegura} de {totalPaginas}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setPagina((p) => Math.min(totalPaginas, p + 1))
                      }
                      disabled={paginaSegura === totalPaginas}
                      className="px-3 py-1.5 text-xs font-semibold text-[#990000] rounded-lg hover:bg-[#990000]/5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#990000]"
                    >
                      Siguiente →
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 pt-4 border-t border-[#E3E1DA] text-center">
            <span className="text-xs text-[#6B6A64]">
              Total atenciones listadas: <strong className="text-[#990000] font-mono">{records.reduce((acc, r) => acc + r.count, 0)}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
