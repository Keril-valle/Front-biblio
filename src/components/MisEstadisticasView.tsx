import React from 'react';
import {
  Bar,
  BarChart,
  Cell,
  CartesianGrid,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { UserSession } from '../types';
import { formatearDuracion } from '../utils/duracion';
import { CategoriaTick } from './CategoriaTick';
import { useMisEstadisticas } from './useMisEstadisticas';

interface MisEstadisticasViewProps {
  session: UserSession;
}

interface FilaBarras {
  nombre: string;
  atenciones: number;
  personas: number;
}

/**
 * Misma orientación que el Dashboard: con "Todos los módulos" las barras son
 * **laterales** (cada nombre cabe en su fila); con un módulo concreto son
 * **verticales** con las etiquetas rotadas a -30°, que es cuando hay pocas
 * categorías y la lectura clásica resulta mejor.
 */
const GraficaBarras: React.FC<{
  datos: FilaBarras[];
  horizontal: boolean;
  testId: string;
  alto: number;
}> = ({ datos, horizontal, testId, alto }) => (
  <div
    data-testid={testId}
    data-orientacion={horizontal ? 'horizontal' : 'vertical'}
    className="overflow-x-auto"
  >
    <div
      style={{ height: alto }}
      className={horizontal ? 'min-w-[520px]' : 'min-w-[560px]'}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout={horizontal ? 'vertical' : 'horizontal'}
          data={datos}
          margin={
            horizontal
              ? { top: 10, right: 30, left: 10, bottom: 10 }
              : { top: 10, right: 20, left: -10, bottom: 50 }
          }
          barCategoryGap="30%"
        >
          {horizontal ? (
            <>
              <CartesianGrid strokeDasharray="3 3" stroke="#E3E1DA" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11, fill: '#585757' }} tickLine={false} />
              <YAxis
                type="category"
                dataKey="nombre"
                width={160}
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
                dataKey="nombre"
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
            }}
          />
          <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
          <Bar
            dataKey="atenciones"
            name="Atenciones"
            fill="#990000"
            radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            maxBarSize={horizontal ? 22 : 40}
          />
          <Bar
            dataKey="personas"
            name="Personas"
            fill="#034991"
            radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            maxBarSize={horizontal ? 22 : 40}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  </div>
);

const COLORES_MODULO = [
  '#990000',
  '#034991',
  '#B8860B',
  '#6B4C9A',
  '#277A59',
  '#C85A17',
  '#68707A',
  '#A41214',
  '#2168A8',
];

const cicloNombre = (anio: number, numero: number) =>
  `${numero === 1 ? 'I' : 'II'} Ciclo ${anio}`;

/**
 * Bitácora privada de la bibliotecóloga. La dona agrupa por módulo para que
 * la persona identifique el tipo de labor que ocupa más de su tiempo, sin
 * mostrar ni consultar información de sus compañeras.
 */
export const MisEstadisticasView: React.FC<MisEstadisticasViewProps> = ({
  session,
}) => {
  const {
    ciclos,
    modulos,
    categorias,
    anios,
    periodo,
    cicloId,
    anio,
    desde,
    hasta,
    moduloId,
    categoriaId,
    resultado,
    estado,
    rangoInvalido,
    setPeriodo,
    setCicloId,
    setAnio,
    setDesde,
    setHasta,
    setModuloId,
    setCategoriaId,
  } = useMisEstadisticas();

  const categoriasFiltro = categorias.filter(
    (c) =>
      c.activo &&
      c.categoriaPadreId === null &&
      (moduloId === '' || c.moduloId === moduloId),
  );
  const modulosDona = (resultado?.subtotales ?? [])
    .filter((m) => m.total > 0)
    .sort((a, b) => b.total - a.total)
    .map((m) => ({ nombre: m.moduloNombre, total: m.total }));
  const moduloPrincipal = modulosDona[0];
  const moduloSeleccionado = modulos.find((m) => m.id === moduloId);
  /** Barras laterales de "Todos los módulos": atenciones y personas por módulo. */
  const datosModulos: FilaBarras[] = (resultado?.subtotales ?? [])
    .map((m) => ({
      nombre: m.moduloNombre,
      atenciones: m.total,
      personas: m.totalPersonas,
    }))
    .sort(
      (a, b) => b.atenciones - a.atenciones || a.nombre.localeCompare(b.nombre, 'es'),
    );
  /**
   * Igual que Dashboard: sin categoría elegida se agrupan las hojas bajo su
   * categoría raíz (Computadoras, por ejemplo). Al elegir una raíz, el
   * endpoint ya filtra esa raíz y sus hijas, así que se ven las modalidades
   * concretas (préstamo/devolución, etc.).
   */
  const datosServicios: FilaBarras[] = Object.values(
    (resultado?.filas ?? []).reduce<
      Record<string, { nombre: string; atenciones: number; personas: number }>
    >((acumulado, fila) => {
      const categoria = categorias.find((c) => c.id === fila.categoriaId);
      const idVisual =
        categoriaId === '' ? (categoria?.categoriaPadreId ?? categoria?.id) : fila.categoriaId;
      const nombreVisual =
        categoriaId === '' && categoria?.categoriaPadreId != null
          ? (categorias.find((c) => c.id === categoria.categoriaPadreId)?.nombre ?? fila.categoriaNombre)
          : fila.categoriaNombre;
      const clave = String(idVisual ?? fila.categoriaId);
      const actual = acumulado[clave] ?? {
        nombre: nombreVisual,
        atenciones: 0,
        personas: 0,
      };
      actual.atenciones += fila.total;
      actual.personas += fila.totalPersonas;
      acumulado[clave] = actual;
      return acumulado;
    }, {}),
  ) as FilaBarras[];
  datosServicios.sort(
    (a, b) =>
      b.atenciones - a.atenciones || a.nombre.localeCompare(b.nombre, 'es'),
  );
  const claseInput =
    'px-3 py-2 rounded-lg border border-[#E3E1DA] text-sm bg-white outline-none focus:border-[#990000] focus:ring-1 focus:ring-[#990000]';

  return (
    <div className="w-full space-y-6">
      <header className="pb-4 border-b border-[#E3E1DA]">
        <span className="text-xs font-bold uppercase tracking-wider text-[#990000]">
          Bitácora personal
        </span>
        <h1 className="mt-0.5 text-2xl font-medium tracking-tight text-[#262624]">
          Mis estadísticas
        </h1>
        <p className="mt-1 text-sm text-[#6B6A64]">
          Tu resumen de atenciones, personas y capacitaciones. Solo vos podés
          ver estos datos.
        </p>
      </header>

      <section
        data-testid="filtros-mis-estadisticas"
        className="flex flex-wrap items-end gap-4 rounded-2xl border border-[#E3E1DA] bg-white p-5 shadow-xs"
      >
        <div>
          <label htmlFor="mis-periodo" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#585757]">
            Período
          </label>
          <select id="mis-periodo" value={periodo} onChange={(e) => setPeriodo(e.target.value as typeof periodo)} className={claseInput}>
            <option value="ciclo">Por ciclo lectivo</option>
            <option value="anio">Anual (I + II ciclo)</option>
            <option value="rango">Rango de fechas</option>
          </select>
        </div>
        {periodo === 'ciclo' && (
          <div>
            <label htmlFor="mis-ciclo" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#585757]">Ciclo lectivo</label>
            <select id="mis-ciclo" value={cicloId} onChange={(e) => setCicloId(e.target.value === '' ? '' : Number(e.target.value))} className={claseInput}>
              {ciclos.map((c) => <option key={c.id} value={c.id}>{cicloNombre(c.anio, c.numero)}</option>)}
            </select>
          </div>
        )}
        {periodo === 'anio' && (
          <div>
            <label htmlFor="mis-anio" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#585757]">Año lectivo</label>
            <select id="mis-anio" value={anio} onChange={(e) => setAnio(e.target.value === '' ? '' : Number(e.target.value))} className={claseInput}>
              <option value="">Todos los años</option>
              {anios.map((a) => <option key={a} value={a}>Año lectivo {a}</option>)}
            </select>
          </div>
        )}
        {periodo === 'rango' && (
          <div className="flex items-end gap-3">
            <div><label htmlFor="mis-desde" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#585757]">Desde</label><input id="mis-desde" type="date" value={desde} onChange={(e) => setDesde(e.target.value)} className={claseInput} /></div>
            <div><label htmlFor="mis-hasta" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#585757]">Hasta</label><input id="mis-hasta" type="date" value={hasta} onChange={(e) => setHasta(e.target.value)} className={claseInput} /></div>
          </div>
        )}
        <div>
          <label htmlFor="mis-modulo" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#585757]">Módulo</label>
          <select id="mis-modulo" value={moduloId} onChange={(e) => setModuloId(e.target.value === '' ? '' : Number(e.target.value))} className={claseInput}>
            <option value="">Todos los módulos</option>
            {modulos.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="mis-categoria" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#585757]">Categoría del servicio</label>
          <select id="mis-categoria" value={categoriaId} onChange={(e) => setCategoriaId(e.target.value === '' ? '' : Number(e.target.value))} className={claseInput}>
            <option value="">Todas las categorías</option>
            {categoriasFiltro.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
      </section>

      {rangoInvalido && (
        <div className="rounded-lg border border-[#E17475] bg-[#FDECEC] p-3 text-xs text-[#7B0E0F]">
          La fecha inicial no puede ser posterior a la final.
        </div>
      )}

      {estado === 'cargando' ? (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((n) => <div key={n} className="h-28 animate-pulse rounded-2xl bg-[#E9E7E1]" />)}
        </div>
      ) : estado === 'error' ? (
        <div className="rounded-xl border border-[#F0B9BA] bg-[#FAE8E8] p-4 text-sm font-semibold text-[#901012]">
          No se pudieron cargar tus estadísticas. Intentá nuevamente.
        </div>
      ) : estado === 'vacio' || !resultado ? (
        <div className="rounded-2xl border border-dashed border-[#E3E1DA] bg-[#F7F6F4]/70 px-6 py-12 text-center">
          <p className="text-sm font-semibold text-[#262624]">Todavía no hay actividad en este período.</p>
          <p className="mt-1 text-xs text-[#6B6A64]">Cuando registrés una atención o recibás una capacitación, aparecerá aquí.</p>
        </div>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <article className="rounded-2xl border-l-4 border-[#990000] bg-white p-5 shadow-xs"><p className="text-[11px] font-bold uppercase tracking-wider text-[#585757]">Atenciones registradas</p><p className="mt-2 font-mono text-3xl font-bold tabular-nums text-[#990000]">{resultado.totalGeneral.total.toLocaleString()}</p></article>
            <article className="rounded-2xl border-l-4 border-[#034991] bg-white p-5 shadow-xs"><p className="text-[11px] font-bold uppercase tracking-wider text-[#585757]">Personas atendidas</p><p className="mt-2 font-mono text-3xl font-bold tabular-nums text-[#034991]">{resultado.totalGeneral.totalPersonas.toLocaleString()}</p></article>
            <article className="rounded-2xl border-l-4 border-[#B8860B] bg-white p-5 shadow-xs"><p className="text-[11px] font-bold uppercase tracking-wider text-[#585757]">Tiempo de capacitación</p><p className="mt-2 font-mono text-3xl font-bold tabular-nums text-[#585757]">{formatearDuracion(resultado.totalGeneral.totalTiempo)}</p></article>
          </section>

          {moduloId === '' ? (
            <>
              <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="rounded-2xl border border-[#E3E1DA] bg-white p-6 shadow-xs">
                  <div className="mb-4"><h2 className="text-sm font-semibold uppercase tracking-wider text-[#262624]">Dónde concentrás tu trabajo</h2><p className="mt-1 text-xs text-[#6B6A64]">La dona agrupa tus atenciones por módulo, no por compañeras.</p></div>
                  <div className="h-[310px]" data-testid="dona-mis-modulos"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={modulosDona} dataKey="total" nameKey="nombre" innerRadius={72} outerRadius={112} paddingAngle={3}>{modulosDona.map((m, i) => <Cell key={m.nombre} fill={COLORES_MODULO[i % COLORES_MODULO.length]} />)}</Pie><Tooltip formatter={(valor: number) => [valor.toLocaleString(), 'Atenciones']} /><Legend verticalAlign="bottom" wrapperStyle={{ fontSize: '11px' }} /></PieChart></ResponsiveContainer></div>
                </div>
                <aside className="rounded-2xl border border-[#E3E1DA] bg-[#F7F6F4] p-6">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#990000]">Módulo principal</p>
                  <p className="mt-3 text-xl font-semibold leading-snug text-[#262624]">{moduloPrincipal?.nombre}</p>
                  <p className="mt-2 font-mono text-3xl font-bold tabular-nums text-[#990000]">{moduloPrincipal?.total.toLocaleString()}</p>
                  <p className="mt-1 text-xs text-[#6B6A64]">atenciones en el período elegido</p>
                </aside>
              </section>

              {/* Todos los módulos → barras laterales (misma regla que Dashboard) */}
              <section className="rounded-2xl border border-[#E3E1DA] bg-white p-6 shadow-xs">
                <div className="mb-4">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-[#262624]">Atenciones y personas por módulo</h2>
                  <p className="mt-1 text-xs text-[#6B6A64]">Tu actividad total de cada módulo con los filtros activos.</p>
                </div>
                <GraficaBarras
                  datos={datosModulos}
                  horizontal
                  testId="barras-mis-estadisticas"
                  alto={Math.max(300, Math.min(520, datosModulos.length * 68))}
                />
              </section>
            </>
          ) : (
            <section className="rounded-2xl border border-[#E3E1DA] bg-white p-6 shadow-xs">
              <div className="mb-4">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-[#262624]">Servicios en {moduloSeleccionado?.nombre}</h2>
                <p className="mt-1 text-xs text-[#6B6A64]">Atenciones y personas de tus registros, con los filtros activos.</p>
              </div>
              {/* Un módulo concreto → barras verticales con etiquetas rotadas */}
              <GraficaBarras
                datos={datosServicios}
                horizontal={false}
                testId="barras-mis-estadisticas"
                alto={340}
              />
            </section>
          )}

          <section className="rounded-2xl border border-[#E3E1DA] bg-white p-6 shadow-xs">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#262624]">Detalle por servicio</h2>
            <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-xs"><thead><tr className="border-b border-[#E3E1DA] text-[11px] uppercase tracking-wider text-[#585757]"><th className="px-2 py-2">Módulo</th><th className="px-2 py-2">Servicio</th><th className="px-2 py-2 text-right">Atenciones</th><th className="px-2 py-2 text-right">Personas</th><th className="px-2 py-2 text-right">Tiempo</th></tr></thead><tbody>{resultado.filas.map((fila) => <tr key={`${fila.origen}-${fila.categoriaId}`} className="border-b border-[#E3E1DA]/70"><td className="px-2 py-2.5 text-[#585757]">{fila.moduloNombre}</td><td className="px-2 py-2.5 font-medium text-[#262624]">{fila.categoriaNombre}</td><td className="px-2 py-2.5 text-right font-mono font-semibold text-[#990000]">{fila.total.toLocaleString()}</td><td className="px-2 py-2.5 text-right font-mono text-[#034991]">{fila.totalPersonas.toLocaleString()}</td><td className="px-2 py-2.5 text-right font-mono text-[#585757]">{formatearDuracion(fila.totalTiempo)}</td></tr>)}</tbody></table></div>
          </section>
        </>
      )}
    </div>
  );
};
