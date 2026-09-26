import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import type { CicloDto, TipoMetrica } from '../types';
import { MODULO_DESCARROLLO_PERSONAL } from '../data/modulos';
import { formatearDuracion } from '../utils/duracion';
import { useEstadisticasDashboard } from './useEstadisticasDashboard';

// Paleta categórica derivada solo de los colores oficiales UNA (rojo, azul
// y gris del Manual de Imagen Gráfica) con sus tintes y sombras permitidos.
const MODULE_COLORS = [
  '#CD1719', // Rojo UNA (Pantone 185)
  '#034991', // Azul UNA (Pantone Reflex Blue)
  '#7B0E0F', // Rojo UNA, sombra al 40%
  '#356DA7', // Azul UNA, tinte al 20%
  '#E17475', // Rojo UNA, tinte al 40%
  '#023366', // Azul UNA, sombra al 30%
  '#585757', // Gris UNA accesible
  '#6892BD', // Azul UNA, tinte al 40%
];

// Configuración del gráfico de barras horizontales: la altura crece una fila
// por categoría para que ninguna etiqueta se superponga, con un tope y scroll.
const BAR_CHART_MIN_HEIGHT = 300;
const BAR_CHART_MAX_HEIGHT = 520;
const BAR_CHART_SINGLE_MODULE_HEIGHT = 340;
const BAR_ROW_BASE_HEIGHT = 24;
const BAR_ROW_SERIES_HEIGHT = 22;
const Y_AXIS_CATEGORY_WIDTH = 160;
const MAX_CATEGORY_LABEL_LENGTH = 26;

interface CategoriaTickProps {
  x?: number;
  y?: number;
  payload?: { value?: string };
}

/** Esqueleto de carga con la misma forma que la sección que reemplaza. */
const SkeletonCaja: React.FC<{ testId?: string; className?: string }> = ({
  testId,
  className = '',
}) => (
  <div
    data-testid={testId}
    className={`animate-pulse bg-[#E9E7E1] rounded ${className}`}
  />
);

/**
 * Tick del eje Y para nombres de categoría: trunca con ellipsis los nombres
 * muy largos y expone el nombre completo vía tooltip nativo (<title>).
 */
const CategoriaTick: React.FC<CategoriaTickProps> = ({ x = 0, y = 0, payload }) => {
  const nombre = payload?.value ?? '';
  const etiqueta =
    nombre.length > MAX_CATEGORY_LABEL_LENGTH
      ? `${nombre.slice(0, MAX_CATEGORY_LABEL_LENGTH - 1)}…`
      : nombre;

  return (
    <g transform={`translate(${x},${y})`}>
      <text x={-8} y={0} dy={4} textAnchor="end" fontSize={11} fill="#585757">
        {etiqueta}
        <title>{nombre}</title>
      </text>
    </g>
  );
};

interface DashboardChartsProps {
  role: 'bibliotecologa' | 'jefa' | 'jefatura';
}

const etiquetaMetrica = (tipo: TipoMetrica): string => {
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

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ role }) => {
  const isJefatura = role === 'jefa' || role === 'jefatura';
  const {
    ciclos,
    modulos,
    categorias,
    anios,
    cicloId,
    moduloId,
    categoriaId,
    medidaComparativo,
    sedeId,
    comparisonMode,
    setCicloId,
    setModuloId,
    setCategoriaId,
    setMedidaComparativo,
    setSedeId,
    setComparisonMode,
    kpis,
    estadoKpis,
    barData,
    estadoComparativo,
    totalesComparativo,
    composition,
    estadoComposicion,
    capacitaciones,
    estadoCapacitaciones,
  } = useEstadisticasDashboard(role);

  const cycleName = (c: CicloDto) => `${c.numero === 1 ? 'I' : 'II'} Ciclo ${c.anio}`;

  const totalCompositionCount = composition.reduce((acc, curr) => acc + curr.valor, 0);
  const totalCompositionPersonas = composition.reduce(
    (acc, curr) => acc + curr.totalPersonas,
    0,
  );
  const esDesarrolloPersonal = Number(moduloId) === MODULO_DESCARROLLO_PERSONAL;
  const etiquetaMedida =
    medidaComparativo === 'personas' ? 'personas capacitadas' : 'eventos';
  // Totales del panel de capacitaciones (Desarrollo Personal).
  const totalEventosCapacitacion = capacitaciones.reduce(
    (acc, c) => acc + c.eventos,
    0,
  );
  const totalPersonasCapacitadas = capacitaciones.reduce(
    (acc, c) => acc + c.personas,
    0,
  );
  const totalTiempoCapacitaciones = capacitaciones.reduce(
    (acc, c) => acc + c.tiempo,
    0,
  );
  // En modo anual el panel "Total del Módulo" muestra el acumulado de todos
  // los años (ya filtrado por módulo y campus) en vez del ciclo seleccionado.
  const totalAnualModulo: number = Object.keys(totalesComparativo).reduce<number>(
    (acc, k) => acc + (totalesComparativo[k] ?? 0),
    0,
  );
  const totalModuloMostrado =
    comparisonMode === 'anual'
      ? totalAnualModulo
      : esDesarrolloPersonal && medidaComparativo === 'personas'
        ? totalCompositionPersonas
        : totalCompositionCount;

  // Altura dinámica: una fila por categoría con espacio para cada serie agrupada.
  const seriesCount =
    comparisonMode === 'anual' ? Math.max(anios.length, 1) : 2;
  const barChartHeight = Math.max(
    BAR_CHART_MIN_HEIGHT,
    barData.length * (BAR_ROW_BASE_HEIGHT + seriesCount * BAR_ROW_SERIES_HEIGHT),
  );

  // Orientación del gráfico: barras laterales solo con "Todos los módulos";
  // con un módulo concreto se usa el gráfico vertical clásico (pocas categorías).
  const usarBarrasLaterales = moduloId === '';
  const alturaGrafico = usarBarrasLaterales
    ? barChartHeight
    : BAR_CHART_SINGLE_MODULE_HEIGHT;
  const barRadius: [number, number, number, number] = usarBarrasLaterales
    ? [0, 4, 4, 0]
    : [4, 4, 0, 0];
  const barMaxSize = usarBarrasLaterales ? 22 : 40;

  // Ámbito del encabezado: con "Ambos campus" se muestra el Subsistema;
  // al filtrar un campus concreto se muestra ese campus y su biblioteca.
  const nombreAmbito =
    sedeId === 1
      ? 'Campus Nicoya — Biblioteca Nayuribe'
      : sedeId === 2
      ? 'Campus Liberia — Biblioteca Rose Marie Ruiz Bravo'
      : 'Subsistema de Bibliotecas Chorotega';
  const nombreModuloSeleccionado =
    moduloId === ''
      ? 'Todos los módulos'
      : (modulos.find((m) => m.id === moduloId)?.nombre ?? 'Módulo seleccionado');
  const cicloSeleccionado = ciclos.find((c) => c.id === cicloId);
  const categoriasFiltro = categorias.filter(
    (c) =>
      c.activo &&
      c.categoriaPadreId === null &&
      (moduloId === '' || c.moduloId === moduloId),
  );
  const categoriaSeleccionada = categoriasFiltro.find((c) => c.id === categoriaId);
  const tieneSubcategorias =
    categoriaId !== '' && categorias.some((c) => c.activo && c.categoriaPadreId === categoriaId);
  const nombreCampusSeleccionado =
    sedeId === 1 ? 'Campus Nicoya' : sedeId === 2 ? 'Campus Liberia' : 'Ambos campus';
  // Resumen de totales por serie para verificación visual inmediata.
  const resumenTotalesComparativo =
    `${esDesarrolloPersonal && medidaComparativo === 'personas' ? 'Personas capacitadas — ' : ''}${comparisonMode === 'ciclos'
      ? `I Ciclo: ${(totalesComparativo.iCiclo ?? 0).toLocaleString()} · II Ciclo: ${(totalesComparativo.iiCiclo ?? 0).toLocaleString()}`
      : comparisonMode === 'campus'
      ? `Nicoya: ${(totalesComparativo.nicoya ?? 0).toLocaleString()} · Liberia: ${(totalesComparativo.liberia ?? 0).toLocaleString()}`
      : anios.map((a) => `${a}: ${(totalesComparativo[String(a)] ?? 0).toLocaleString()}`).join(' · ')}`;
  const tituloEstadistica = esDesarrolloPersonal
    ? `${nombreModuloSeleccionado}: ${etiquetaMedida} por capacitación`
    : categoriaSeleccionada
      ? tieneSubcategorias
        ? `${categoriaSeleccionada.nombre}: detalle por modalidad`
        : `${categoriaSeleccionada.nombre}: atención registrada`
    : comparisonMode === 'ciclos'
      ? `${nombreModuloSeleccionado}: I Ciclo y II Ciclo`
      : comparisonMode === 'campus'
        ? `${nombreModuloSeleccionado}: Biblioteca Nayuribe y Biblioteca Rose Marie Ruiz Bravo`
        : `${nombreModuloSeleccionado}: comparativa por año lectivo`;

  return (
    <div className="flex flex-col gap-6">
      {/* Filtros */}
      <section className="order-1 bg-white p-5 rounded-2xl border border-[#E3E1DA] shadow-xs flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5">
            Ciclo Lectivo
          </label>
          <select
            value={cicloId}
            onChange={(e) => setCicloId(e.target.value === '' ? '' : Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-[#E3E1DA] text-sm bg-white outline-none focus:border-[#990000]"
          >
            {ciclos.map((c) => (
              <option key={c.id} value={c.id}>
                {cycleName(c)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5">
            Módulo
          </label>
          <select
            value={moduloId}
            onChange={(e) => setModuloId(e.target.value === '' ? '' : Number(e.target.value))}
            className="px-3 py-2 rounded-lg border border-[#E3E1DA] text-sm bg-white outline-none focus:border-[#990000]"
          >
            <option value="">Todos los módulos</option>
            {modulos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5">
            Categoría del servicio
          </label>
          <select
            value={categoriaId}
            onChange={(e) =>
              setCategoriaId(e.target.value === '' ? '' : Number(e.target.value))
            }
            className="px-3 py-2 rounded-lg border border-[#E3E1DA] text-sm bg-white outline-none focus:border-[#990000]"
          >
            <option value="">Todas las categorías</option>
            {categoriasFiltro.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>

        {isJefatura && (
          <div>
            <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5">
              Campus
            </label>
            <select
              value={sedeId}
              onChange={(e) => {
                const next = e.target.value === '' ? '' : Number(e.target.value);
                setSedeId(next);
                // La comparación por campus solo tiene sentido con ambos campus.
                if (next !== '' && comparisonMode === 'campus') setComparisonMode('ciclos');
              }}
              className="px-3 py-2 rounded-lg border border-[#E3E1DA] text-sm bg-white outline-none focus:border-[#990000]"
            >
              <option value="">Ambos campus</option>
              <option value={1}>Nicoya</option>
              <option value={2}>Liberia</option>
            </select>
          </div>
        )}
      </section>

      {/* 1. KPI Cards Panel */}
      <section className="order-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div className="bg-white px-5 py-4 rounded-2xl border border-[#E3E1DA] shadow-xs">
          <span className="text-xs font-semibold text-[#585757] uppercase tracking-wider">
            Atenciones del Ciclo
          </span>
          {estadoKpis === 'cargando' ? (
            <SkeletonCaja testId="skeleton-kpis" className="h-8 w-24 mt-1.5" />
          ) : estadoKpis === 'error' ? (
            <p className="text-sm font-semibold text-[#990000] mt-1.5">
              No se pudieron cargar los datos.
            </p>
          ) : (
            <p className="text-2xl font-bold text-[#262624] font-mono mt-1.5">
              {kpis.totalAtenciones.toLocaleString()}
            </p>
          )}
          <p className="text-[11px] text-[#6B6A64] mt-1">
            {cicloSeleccionado ? `${cycleName(cicloSeleccionado)} · ` : ''}
            {nombreModuloSeleccionado} · {nombreCampusSeleccionado}
          </p>
        </div>

        <div className="bg-white px-5 py-4 rounded-2xl border border-[#E3E1DA] shadow-xs">
          <span className="text-xs font-semibold text-[#585757] uppercase tracking-wider">
            Personas Atendidas
          </span>
          {estadoKpis === 'cargando' ? (
            <SkeletonCaja className="h-8 w-24 mt-1.5" />
          ) : estadoKpis === 'error' ? (
            <p className="text-sm font-semibold text-[#990000] mt-1.5">
              No se pudieron cargar los datos.
            </p>
          ) : (
            <p className="text-2xl font-bold text-[#990000] font-mono mt-1.5">
              {kpis.totalPersonas.toLocaleString()}
            </p>
          )}
          <p className="text-[11px] text-[#6B6A64] mt-1">
            Capacitaciones y actividades con personas
          </p>
        </div>

        <div className="bg-white px-5 py-4 rounded-2xl border border-[#E3E1DA] shadow-xs">
          <span className="text-xs font-semibold text-[#585757] uppercase tracking-wider">
            Tiempo de Capacitación
          </span>
          {estadoKpis === 'cargando' ? (
            <SkeletonCaja className="h-8 w-24 mt-1.5" />
          ) : estadoKpis === 'error' ? (
            <p className="text-sm font-semibold text-[#990000] mt-1.5">
              No se pudieron cargar los datos.
            </p>
          ) : (
            <p className="text-2xl font-bold text-[#034991] font-mono mt-1.5">
              {formatearDuracion(kpis.totalTiempo)}
            </p>
          )}
          <p className="text-[11px] text-[#6B6A64] mt-1">
            Horas:minutos acumulados en capacitaciones
          </p>
        </div>
      </section>

      {/* Total del alcance activo: módulo o categoría seleccionada. */}
      {moduloId !== '' && (
        <section className="order-3 bg-[#990000]/5 border border-[#990000]/20 rounded-2xl px-5 py-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#990000] text-white flex items-center justify-center shrink-0">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#990000]">
                  {categoriaSeleccionada ? 'Total de la Categoría' : 'Total del Módulo'}
                </span>
                <h2 className="text-base font-semibold text-[#262624] font-goudy leading-tight">
                  {categoriaSeleccionada?.nombre ?? modulos.find((m) => m.id === moduloId)?.nombre ?? 'Módulo seleccionado'}
                </h2>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[#990000] font-mono">
                {totalModuloMostrado.toLocaleString()}
              </p>
              <p className="text-[11px] text-[#6B6A64]">
                {esDesarrolloPersonal
                  ? `${totalModuloMostrado.toLocaleString()} ${etiquetaMedida} ${comparisonMode === 'anual' ? 'en todos los años' : 'en el ciclo seleccionado'}`
                  : comparisonMode === 'anual'
                    ? categoriaSeleccionada
                      ? 'atenciones de la categoría en todos los años'
                      : 'atenciones del módulo en todos los años'
                    : categoriaSeleccionada
                      ? 'atenciones de la categoría en el ciclo seleccionado'
                      : 'atenciones del módulo en el ciclo seleccionado'}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Comparativo: resultado principal inmediatamente después de los filtros. */}
      <section className="order-2 bg-white p-6 rounded-2xl border border-[#E3E1DA] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E3E1DA]">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#990000]">
              {nombreAmbito}
            </span>
            <h2 className="text-base font-semibold text-[#262624] font-goudy mt-0.5">
              {tituloEstadistica}
            </h2>
              <p className="text-xs text-[#6B6A64] mt-0.5">
                {esDesarrolloPersonal
                  ? `Comparación por capacitación: ${etiquetaMedida}.`
                  : categoriaSeleccionada
                    ? tieneSubcategorias
                      ? `Desglose de ${categoriaSeleccionada.nombre} por modalidad de servicio.`
                      : `${categoriaSeleccionada.nombre} no tiene modalidades adicionales.`
                  : 'Comparación exacta de magnitudes discretas para evaluar demanda por servicio.'}
              </p>
            {barData.length > 0 && (
              <p className="text-xs font-semibold text-[#262624] mt-1 font-mono">
                {resumenTotalesComparativo}
              </p>
            )}
            {esDesarrolloPersonal && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#6B6A64]">
                  Barras
                </span>
                <div
                  role="group"
                  aria-label="Medida de las barras de Desarrollo Personal"
                  className="inline-flex items-center rounded-lg border border-[#E3E1DA] bg-[#F7F6F4] p-0.5"
                >
                  <button
                    type="button"
                    aria-pressed={medidaComparativo === 'eventos'}
                    onClick={() => setMedidaComparativo('eventos')}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#990000] ${
                      medidaComparativo === 'eventos'
                        ? 'bg-white text-[#990000] shadow-xs'
                        : 'text-[#585757] hover:text-[#262624]'
                    }`}
                  >
                    Eventos
                  </button>
                  <button
                    type="button"
                    aria-pressed={medidaComparativo === 'personas'}
                    onClick={() => setMedidaComparativo('personas')}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#034991] ${
                      medidaComparativo === 'personas'
                        ? 'bg-white text-[#034991] shadow-xs'
                        : 'text-[#585757] hover:text-[#262624]'
                    }`}
                  >
                    Personas capacitadas
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 bg-[#F7F6F4] p-1 rounded-xl border border-[#E3E1DA]">
            <button
              onClick={() => setComparisonMode('ciclos')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                comparisonMode === 'ciclos'
                  ? 'bg-white text-[#990000] shadow-xs'
                  : 'text-[#585757] hover:text-[#262624]'
              }`}
            >
              I/II Ciclo
            </button>
            {isJefatura && sedeId === '' && (
              <button
                onClick={() => setComparisonMode('campus')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  comparisonMode === 'campus'
                    ? 'bg-white text-[#990000] shadow-xs'
                    : 'text-[#585757] hover:text-[#262624]'
                }`}
              >
                Campus
              </button>
            )}
            <button
              onClick={() => setComparisonMode('anual')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                comparisonMode === 'anual'
                  ? 'bg-white text-[#990000] shadow-xs'
                  : 'text-[#585757] hover:text-[#262624]'
              }`}
            >
              Anual
            </button>
          </div>
        </div>

        <div className="w-full pt-2 overflow-y-auto" style={{ maxHeight: BAR_CHART_MAX_HEIGHT }}>
          {estadoComparativo === 'cargando' ? (
            <SkeletonCaja testId="skeleton-comparativo" className="h-72 w-full" />
          ) : estadoComparativo === 'error' ? (
            <div className="h-72 flex items-center justify-center">
              <p className="text-xs font-semibold text-[#990000]">
                No se pudieron cargar los datos del comparativo.
              </p>
            </div>
          ) : barData.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-xs text-[#6B6A64]">
              No hay datos suficientes para mostrar el comparativo.
            </div>
          ) : (
            <div style={{ height: alturaGrafico }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout={usarBarrasLaterales ? 'vertical' : 'horizontal'}
                  data={barData}
                  margin={
                    usarBarrasLaterales
                      ? { top: 10, right: 30, left: 10, bottom: 10 }
                      : { top: 10, right: 20, left: -10, bottom: 50 }
                  }
                  barCategoryGap="30%"
                >
                  {usarBarrasLaterales ? (
                    <>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E3E1DA" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#585757' }} tickLine={false} />
                      <YAxis
                        type="category"
                        dataKey="categoria"
                        width={Y_AXIS_CATEGORY_WIDTH}
                        interval={0}
                        tickLine={false}
                        tick={<CategoriaTick />}
                      />
                    </>
                  ) : (
                    <>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E3E1DA" vertical={false} />
                      <XAxis
                        type="category"
                        dataKey="categoria"
                        interval={0}
                        angle={-30}
                        textAnchor="end"
                        height={70}
                        tickMargin={12}
                        tick={{ fontSize: 11, fill: '#585757' }}
                        tickLine={false}
                      />
                      <YAxis type="number" tick={{ fontSize: 11, fill: '#585757' }} tickLine={false} />
                    </>
                  )}
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E3E1DA',
                      borderRadius: '12px',
                      fontSize: '12px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                    }}
                    formatter={(value: number) => [
                      `${value} ${esDesarrolloPersonal
                        ? medidaComparativo === 'personas'
                          ? 'personas'
                          : 'eventos'
                        : 'atenciones'}`,
                      '',
                    ]}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />

                  {comparisonMode === 'ciclos' ? (
                    <>
                      <Bar
                        dataKey="iCiclo"
                        name="I Ciclo"
                        fill="#990000"
                        radius={barRadius}
                        maxBarSize={barMaxSize}
                      />
                      <Bar
                        dataKey="iiCiclo"
                        name="II Ciclo"
                        fill="#034991"
                        radius={barRadius}
                        maxBarSize={barMaxSize}
                      />
                    </>
                  ) : comparisonMode === 'campus' ? (
                    <>
                      <Bar
                        dataKey="nicoya"
                        name="Biblioteca Nayuribe (Nicoya)"
                        fill="#990000"
                        radius={barRadius}
                        maxBarSize={barMaxSize}
                      />
                      <Bar
                        dataKey="liberia"
                        name="Biblioteca Rose Marie (Liberia)"
                        fill="#034991"
                        radius={barRadius}
                        maxBarSize={barMaxSize}
                      />
                    </>
                  ) : (
                    anios.map((anio, idx) => (
                      <Bar
                        key={anio}
                        dataKey={String(anio)}
                        name={`Año ${anio}`}
                        fill={MODULE_COLORS[idx % MODULE_COLORS.length]}
                        radius={barRadius}
                        maxBarSize={barMaxSize}
                      />
                    ))
                  )}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      {/* 4. Donut Chart: Composición de Módulo */}
      <section className="order-5 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E3E1DA] shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E3E1DA]">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#990000]">
                Proporción Relativa del Módulo (Dona)
              </span>
              <h2 className="text-base font-semibold text-[#262624] font-goudy mt-0.5">
                Composición de Atenciones por Categoría
              </h2>
              <p className="text-xs text-[#6B6A64] mt-0.5">
                Visualización en dona para responder qué categoría predomina.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <div className="h-64 relative flex items-center justify-center">
              {estadoComposicion === 'cargando' ? (
                <SkeletonCaja testId="skeleton-composicion" className="h-52 w-52 rounded-full" />
              ) : estadoComposicion === 'error' ? (
                <p className="text-xs font-semibold text-[#990000]">
                  No se pudieron cargar los datos del módulo.
                </p>
              ) : composition.length === 0 ? (
                <div className="text-xs text-[#6B6A64]">Sin datos para mostrar.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={composition}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={3}
                      dataKey="valor"
                      nameKey="nombre"
                    >
                      {composition.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={MODULE_COLORS[index % MODULE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#FFFFFF',
                        borderColor: '#E3E1DA',
                        borderRadius: '12px',
                        fontSize: '12px',
                      }}
                      formatter={(val: number) => [
                        `${val} (${totalCompositionCount ? ((val / totalCompositionCount) * 100).toFixed(1) : 0}%)`,
                        'Atenciones',
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}

              {estadoComposicion !== 'cargando' && estadoComposicion !== 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-2xl font-bold font-mono text-[#262624]">
                    {totalCompositionCount.toLocaleString()}
                  </span>
                  <span className="text-[10px] font-semibold text-[#6B6A64] uppercase tracking-wider">
                    Total Atenciones
                  </span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-[#585757] uppercase tracking-wider block mb-2">
                {categoriaSeleccionada && tieneSubcategorias
                  ? 'Desglose por Modalidad'
                  : 'Desglose por Categoría'}
              </span>
              {estadoComposicion === 'cargando' ? (
                <div className="space-y-2" data-testid="skeleton-desglose">
                  <SkeletonCaja className="h-8 w-full" />
                  <SkeletonCaja className="h-8 w-full" />
                  <SkeletonCaja className="h-8 w-3/4" />
                </div>
              ) : estadoComposicion === 'error' ? (
                <p className="text-xs text-[#990000]">
                  No se pudieron cargar los datos del módulo.
                </p>
              ) : composition.length === 0 ? (
                <p className="text-xs text-[#6B6A64]">Sin datos.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                  {composition.map((item, idx) => {
                    const percentage = totalCompositionCount
                      ? ((item.valor / totalCompositionCount) * 100).toFixed(1)
                      : '0.0';
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-lg bg-[#F7F6F4]/60 border border-[#E3E1DA]/60 text-xs"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className="w-3 h-3 rounded-full shrink-0"
                            style={{ backgroundColor: MODULE_COLORS[idx % MODULE_COLORS.length] }}
                          />
                          <span className="font-medium text-[#262624] truncate">{item.nombre}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono shrink-0">
                          <span className="text-[#585757] font-semibold">{item.valor}</span>
                          {/* Personas y tiempo de la porción: en Desarrollo
                              Personal cada porción es una capacitación. */}
                          {item.totalPersonas > 0 && (
                            <span className="text-[11px] font-semibold text-[#034991] bg-[#034991]/10 rounded px-1.5 py-0.5">
                              {item.totalPersonas} personas
                            </span>
                          )}
                          {item.totalTiempo > 0 && (
                            <span className="text-[11px] text-[#6B6A64]">
                              {formatearDuracion(item.totalTiempo)}
                            </span>
                          )}
                          <span className="text-[11px] text-[#6B6A64]">({percentage}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Categorías disponibles */}
        <div className="bg-[#990000]/5 border border-[#990000]/20 rounded-2xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 text-[#990000] font-semibold text-xs uppercase tracking-wider mb-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Catálogo de Categorías
            </div>
            <h3 className="text-sm font-bold text-[#262624] font-goudy mb-2">
              Categorías registrables del sistema
            </h3>
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {categorias
                .filter((c) => c.activo)
                .map((cat) => (
                  <div key={cat.id} className="text-xs text-[#585757] flex items-start gap-2 py-1 border-b border-[#990000]/10 last:border-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#990000] mt-1 shrink-0" />
                    <span>
                      <strong className="text-[#262624]">{cat.nombre}</strong>
                      <span className="block text-[11px] text-[#6B6A64]">
                        {cat.modulo?.nombre} · {etiquetaMetrica(cat.tipoMetrica)}
                      </span>
                    </span>
                  </div>
                ))}
            </div>
          </div>

          <div className="pt-3 border-t border-[#990000]/20 text-[11px] text-[#6B6A64] italic">
            Librería nativa Recharts — Datos en tiempo real del subsistema.
          </div>
        </div>
      </section>

      {/* 5. Capacitaciones del personal: en Desarrollo Personal la estadística
          tiene que decir cuántas personas recibió cada capacitación. */}
      {moduloId === MODULO_DESCARROLLO_PERSONAL && (
        <section
          data-testid="panel-capacitaciones"
          className="order-6 overflow-hidden rounded-2xl border border-[#E3E1DA] border-t-2 border-t-[#034991] bg-white shadow-xs"
        >
          <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#034991]/10 text-[#034991]">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4z" />
                </svg>
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#034991]">
                  Desarrollo Personal
                </p>
                <h2 className="mt-0.5 text-lg font-semibold leading-tight text-[#262624] font-goudy">
                  Personas capacitadas por taller
                </h2>
                <p className="mt-1 text-xs text-[#6B6A64]">
                  Asistencia en el ciclo, campus y filtros seleccionados.
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3 rounded-xl border border-[#034991]/15 bg-[#E6EDF4]/60 px-4 py-2.5 sm:min-w-52 sm:justify-end">
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#034991]">
                  Total de personas
                </p>
                <p className="mt-0.5 font-mono text-2xl font-bold leading-none tabular-nums text-[#034991]">
                  {totalPersonasCapacitadas.toLocaleString()}
                </p>
                <p className="mt-1 text-[10px] text-[#585757]">
                  {totalEventosCapacitacion.toLocaleString()} eventos
                  {totalTiempoCapacitaciones > 0 && (
                    <> · {formatearDuracion(totalTiempoCapacitaciones)} de formación</>
                  )}
                </p>
              </div>
            </div>
          </div>

          {estadoCapacitaciones === 'cargando' ? (
            <div className="space-y-2 px-5 pb-5 sm:px-6 sm:pb-6" data-testid="skeleton-capacitaciones">
              <SkeletonCaja className="h-8 w-full" />
              <SkeletonCaja className="h-8 w-3/4" />
            </div>
          ) : estadoCapacitaciones === 'error' ? (
            <p className="px-5 pb-5 text-xs text-[#990000] sm:px-6 sm:pb-6">
              No se pudieron cargar las capacitaciones.
            </p>
          ) : capacitaciones.length === 0 ? (
            <div className="mx-5 mb-5 rounded-xl border border-dashed border-[#E3E1DA] bg-[#F7F6F4]/70 px-4 py-5 text-center sm:mx-6 sm:mb-6">
              <p className="text-sm font-medium text-[#262624]">Sin asistencia registrada</p>
              <p className="mt-1 text-xs text-[#6B6A64]" data-testid="capacitaciones-vacio">
                Todavía no hay capacitaciones en este período.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto border-t border-[#E3E1DA]">
              <table className="w-full min-w-[680px] text-xs">
                <thead>
                  <tr className="border-b border-[#E3E1DA] bg-[#F7F6F4]/70 text-left text-[10px] uppercase tracking-[0.12em] text-[#6B6A64]">
                    <th scope="col" className="px-5 py-3 font-bold sm:px-6">Capacitación</th>
                    <th scope="col" className="px-3 py-3 text-right font-bold">Eventos</th>
                    <th scope="col" className="px-3 py-3 text-right font-bold">Personas</th>
                    <th scope="col" className="px-3 py-3 text-right font-bold">Tiempo</th>
                    <th scope="col" className="px-5 py-3 font-bold sm:px-6">Asistentes</th>
                  </tr>
                </thead>
                <tbody>
                  {capacitaciones.map((capacitacion) => (
                    <tr
                      key={capacitacion.categoriaId}
                      className="border-b border-[#E3E1DA]/70 align-top transition-colors last:border-0 hover:bg-[#F7F6F4]/60"
                    >
                      <td className="px-5 py-3 font-semibold text-[#262624] sm:px-6">
                        {capacitacion.nombre}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-[#585757]">
                        {capacitacion.eventos}
                      </td>
                      <td className="px-3 py-3 text-right font-mono font-bold tabular-nums text-[#034991]">
                        {capacitacion.personas}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums text-[#585757]">
                        {capacitacion.tiempo > 0 ? formatearDuracion(capacitacion.tiempo) : '—'}
                      </td>
                      <td className="px-5 py-2.5 text-[#585757] sm:px-6">
                        <div className="flex max-w-[28rem] flex-wrap gap-1.5">
                          {capacitacion.asistentes.length > 0 ? capacitacion.asistentes.map((asistente) => (
                            <span key={asistente} className="inline-flex rounded-full border border-[#E3E1DA] bg-white px-2 py-0.5 text-[10px] text-[#585757]">
                              {asistente}
                            </span>
                          )) : <span className="text-[#6B6A64]">—</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
