import React, { useEffect, useState } from 'react';
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
import { api } from '../api/client';
import {
  CategoriaDto,
  CicloDto,
  ComposicionDto,
  KpisDto,
  PorCategoriaDto,
} from '../types';

export interface BarChartDataItem {
  categoria: string;
  iCiclo?: number;
  iiCiclo?: number;
  nicoya?: number;
  liberia?: number;
  [anio: string]: number | string | undefined;
}

const MODULE_COLORS = [
  '#990000',
  '#034991',
  '#007A78',
  '#D97706',
  '#585757',
  '#9CA3AF',
  '#7C3AED',
  '#DB2777',
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

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ role }) => {
  const isJefatura = role === 'jefa' || role === 'jefatura';
  const [comparisonMode, setComparisonMode] = useState<'ciclos' | 'campus' | 'anual'>('ciclos');
  const [ciclos, setCiclos] = useState<CicloDto[]>([]);
  const [cicloId, setCicloId] = useState<number | ''>('');
  const [modulos, setModulos] = useState<{ id: number; nombre: string }[]>([]);
  const [moduloId, setModuloId] = useState<number | ''>('');
  // Filtro por sede (solo jefatura puede elegir; bibliotecóloga queda fija a su sede).
  const [sedeId, setSedeId] = useState<number | ''>('');

  const [kpis, setKpis] = useState<KpisDto>({ totalAtenciones: 0, totalPersonas: 0 });
  const [barData, setBarData] = useState<BarChartDataItem[]>([]);
  const [composition, setComposition] = useState<ComposicionDto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaDto[]>([]);
  const [loading, setLoading] = useState(true);

  const cycleName = (c: CicloDto) => `${c.numero === 1 ? 'I' : 'II'} Ciclo ${c.anio}`;

  // Años lectivos disponibles (para el modo "anual").
  const anios: number[] = Array.from(new Set<number>(ciclos.map((c) => c.anio))).sort(
    (a: number, b: number) => a - b,
  );

  useEffect(() => {
    Promise.all([api.ciclos(), api.modulos(), api.categorias()])
      .then(([cic, mods, cats]) => {
        setCiclos(cic);
        setModulos(mods.map((m) => ({ id: m.id, nombre: m.nombre })));
        setCategorias(cats);
        const primerCiclo = cic[0];
        if (primerCiclo) setCicloId(primerCiclo.id);
      })
      .catch(() => setLoading(false));
  }, []);

  // Cargar KPIs + composición cuando cambia el ciclo/módulo/sede.
  useEffect(() => {
    if (cicloId === '') return;
    setLoading(true);

    const cid = cicloId === '' ? undefined : Number(cicloId);
    const mid = moduloId === '' ? undefined : Number(moduloId);
    const sid = sedeId === '' ? undefined : Number(sedeId);

    api
      .kpis(cid, sid)
      .then(setKpis)
      .catch(() => undefined);

    api
      .composicion(cid, mid, sid)
      .then(setComposition)
      .catch(() => setComposition([]))
      .finally(() => setLoading(false));
  }, [cicloId, moduloId, sedeId]);

  // Comparativo por categoría según el modo (ciclos vs sedes).
  useEffect(() => {
    if (cicloId === '') return;

    const cid = cicloId === '' ? undefined : Number(cicloId);
    const mid = moduloId === '' ? undefined : Number(moduloId);
    const sid = sedeId === '' ? undefined : Number(sedeId);

    if (comparisonMode === 'ciclos') {
      Promise.all(
        ciclos.map((c) =>
          api.porCategoria(c.id, mid, sid),
        ),
      )
        .then((results) => {
          const map = new Map<string, BarChartDataItem>();
          results.forEach((rows: PorCategoriaDto[], idx) => {
            const label = cycleName(ciclos[idx]);
            rows.forEach((row) => {
              const entry = map.get(row.categoriaNombre) ?? {
                categoria: row.categoriaNombre,
              };
              if (idx === 0) entry.iCiclo = row.total;
              else entry.iiCiclo = row.total;
              map.set(row.categoriaNombre, entry);
            });
          });
          setBarData(Array.from(map.values()));
        })
        .catch(() => setBarData([]));
    } else if (comparisonMode === 'anual') {
      api
        .porAnio(mid, sid)
        .then((rows) => {
          const map = new Map<string, Record<string, number | undefined>>();
          rows.forEach((row) => {
            const entry = map.get(row.categoriaNombre) ?? {};
            entry[String(row.anio)] = row.total;
            map.set(row.categoriaNombre, entry);
          });
          setBarData(
            Array.from(map.entries()).map(([cat, anioData]) => ({
              categoria: cat,
              ...anioData,
            })),
          );
        })
        .catch(() => setBarData([]));
    } else {
      api
        .porCategoria(cid, mid, sid)
        .then((rows) => setBarData(rows.map((r) => ({ categoria: r.categoriaNombre }))))
        .catch(() => setBarData([]));

      api
        .comparativoSedes(cid)
        .then((sedes) => {
          if (sedes.length === 0) {
            setBarData([]);
            return;
          }
          const nicoya = sedes.find((s) => s.sedeNombre === 'Nicoya')?.total ?? 0;
          const liberia = sedes.find((s) => s.sedeNombre === 'Liberia')?.total ?? 0;
          setBarData([
            { categoria: 'Total General', nicoya, liberia },
          ]);
        })
        .catch(() => setBarData([]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [comparisonMode, cicloId, moduloId, sedeId]);

  const totalCompositionCount = composition.reduce((acc, curr) => acc + curr.valor, 0);

  // Altura dinámica: una fila por categoría con espacio para cada serie agrupada.
  const seriesCount = comparisonMode === 'anual' ? Math.max(anios.length, 1) : 2;
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

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <section className="bg-white p-5 rounded-2xl border border-[#E3E1DA] shadow-xs flex flex-wrap items-end gap-4">
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

        {isJefatura && (
          <div>
            <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5">
              Campus
            </label>
            <select
              value={sedeId}
              onChange={(e) => setSedeId(e.target.value === "" ? "" : Number(e.target.value))}
              className="px-3 py-2 rounded-lg border border-[#E3E1DA] text-sm bg-white outline-none focus:border-[#990000]"
            >
              <option value="">Todos los campus</option>
              <option value={1}>Nicoya</option>
              <option value={2}>Liberia</option>
            </select>
          </div>
        )}
        {loading && <span className="text-xs text-[#6B6A64] pb-2">Cargando datos...</span>}
      </section>

      {/* 1. KPI Cards Panel */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-[#E3E1DA] shadow-xs">
          <span className="text-xs font-semibold text-[#585757] uppercase tracking-wider">
            Atenciones del Ciclo
          </span>
          <p className="text-3xl font-bold text-[#262624] font-mono mt-2">
            {kpis.totalAtenciones.toLocaleString()}
          </p>
          <p className="text-[11px] text-[#6B6A64] mt-1">Suma de atenciones registradas</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-[#E3E1DA] shadow-xs">
          <span className="text-xs font-semibold text-[#585757] uppercase tracking-wider">
            Personas Atendidas
          </span>
          <p className="text-3xl font-bold text-[#990000] font-mono mt-2">
            {kpis.totalPersonas.toLocaleString()}
          </p>
          <p className="text-[11px] text-[#6B6A64] mt-1">Capacitaciones y actividades con personas</p>
        </div>
      </section>

      {/* 2 & 3. Grouped Bar Chart */}
      <section className="bg-white p-6 rounded-2xl border border-[#E3E1DA] shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E3E1DA]">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#990000]">
              Visualización de Barras Agrupadas
            </span>
            <h2 className="text-base font-semibold text-[#262624] font-goudy mt-0.5">
              {comparisonMode === 'ciclos'
                ? 'Comparativo por Ciclo: I Ciclo vs II Ciclo'
                : comparisonMode === 'campus'
                ? 'Estadística por Campus: Biblioteca Nayuribe y Biblioteca Rose Marie Ruiz Bravo'
                : 'Estadística Anual: Comparativa por Año Lectivo'}
            </h2>
            <p className="text-xs text-[#6B6A64] mt-0.5">
              Comparación exacta de magnitudes discretas para evaluar demanda por servicio.
            </p>
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
            {isJefatura && (
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
          {barData.length === 0 ? (
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
                    formatter={(value: number) => [`${value} atenciones`, '']}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />

                  {comparisonMode === 'ciclos' ? (
                    <>
                      <Bar
                        dataKey="iCiclo"
                        name="I Ciclo Lectivo"
                        fill="#990000"
                        radius={barRadius}
                        maxBarSize={barMaxSize}
                      />
                      <Bar
                        dataKey="iiCiclo"
                        name="II Ciclo Lectivo"
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
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              {composition.length === 0 ? (
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

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-2xl font-bold font-mono text-[#262624]">
                  {totalCompositionCount.toLocaleString()}
                </span>
                <span className="text-[10px] font-semibold text-[#6B6A64] uppercase tracking-wider">
                  Total Atenciones
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-[#585757] uppercase tracking-wider block mb-2">
                Desglose por Categoría
              </span>
              {composition.length === 0 ? (
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
                        {cat.modulo?.nombre} · {cat.tipoMetrica === 'doble' ? 'Cantidad + Personas' : 'Cantidad'}
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
    </div>
  );
};
