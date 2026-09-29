import React from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CAMPUSES } from '../data/campuses';
import type { UserSession } from '../types';
import { formatearDuracion } from '../utils/duracion';
import { CategoriaTick } from './CategoriaTick';
import { useEstadisticasPersonal } from './useEstadisticasPersonal';

interface EstadisticasPersonalViewProps {
  session: UserSession;
}

/** Esqueleto de carga con la misma forma de la sección que reemplaza. */
const SkeletonCaja: React.FC<{ testId?: string; className?: string }> = ({
  testId,
  className = '',
}) => (
  <div
    data-testid={testId}
    className={`animate-pulse bg-[#E9E7E1] rounded ${className}`}
  />
);

/** Una fila de datos de las gráficas de barras de la sección. */
interface FilaBarras {
  nombre: string;
  atenciones: number;
  personas: number;
}

/**
 * Barras horizontales con la misma paleta y patrón que el comparativo del
 * dashboard: una fila por nombre (truncado con `CategoriaTick`), altura
 * dinámica según la cantidad de filas y las mismas series rojo/azul UNA.
 */
const GraficaBarras: React.FC<{ datos: FilaBarras[] }> = ({ datos }) => {
  const altura = Math.max(300, datos.length * 68);
  return (
    <div style={{ height: altura }} data-testid="barras-estadistica">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={datos}
          margin={{ top: 10, right: 30, left: 10, bottom: 10 }}
          barCategoryGap="20%"
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#E3E1DA"
            horizontal={false}
          />
          <XAxis
            type="number"
            tick={{ fontSize: 11, fill: '#585757' }}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="nombre"
            width={160}
            interval={0}
            tickLine={false}
            tick={<CategoriaTick />}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#FFFFFF',
              borderColor: '#E3E1DA',
              borderRadius: '12px',
              fontSize: '12px',
            }}
          />
          <Legend
            verticalAlign="top"
            height={36}
            wrapperStyle={{ fontSize: '12px' }}
          />
          <Bar
            dataKey="atenciones"
            name="Atenciones"
            fill="#990000"
            radius={[0, 4, 4, 0]}
            maxBarSize={22}
          />
          <Bar
            dataKey="personas"
            name="Personas"
            fill="#034991"
            radius={[0, 4, 4, 0]}
            maxBarSize={22}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export const EstadisticasPersonalView: React.FC<
  EstadisticasPersonalViewProps
> = ({ session }) => {
  const campus = CAMPUSES[session.campus];
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
    modo,
    seleccion,
    rangoInvalido,
    setPeriodo,
    setCicloId,
    setAnio,
    setDesde,
    setHasta,
    setModuloId,
    setCategoriaId,
    setModo,
    setSeleccion,
    ranking,
    estadoRanking,
    desglose,
    estadoDesglose,
  } = useEstadisticasPersonal(session.campusId);

  const cycleName = (anioCiclo: number, numero: number) =>
    `${numero === 1 ? 'I' : 'II'} Ciclo ${anioCiclo}`;

  const categoriasFiltro = categorias.filter(
    (c) =>
      c.activo &&
      c.categoriaPadreId === null &&
      (moduloId === '' || c.moduloId === moduloId),
  );

  const empleadaSeleccionada = ranking.find((f) => f.usuarioId === seleccion);

  const totalRanking = ranking.reduce(
    (acc, f) => ({
      atenciones: acc.atenciones + f.atenciones,
      personas: acc.personas + f.personas,
      tiempo: acc.tiempo + f.tiempo,
    }),
    { atenciones: 0, personas: 0, tiempo: 0 },
  );

  // Datos de las gráficas de barras: en General, una fila por empleada; en
  // Personal específico, una fila por categoría del desglose.
  const datosBarrasRanking: FilaBarras[] = ranking.map((f) => ({
    nombre: f.nombreCompleto,
    atenciones: f.atenciones,
    personas: f.personas,
  }));

  const datosBarrasDesglose: FilaBarras[] = (desglose?.filas ?? []).map((f) => ({
    nombre: f.categoriaNombre,
    atenciones: f.total,
    personas: f.totalPersonas,
  }));

  const claseInput =
    'px-3 py-2 rounded-lg border border-[#E3E1DA] text-sm bg-white outline-none focus:border-[#990000]';

  return (
    <div className="w-full space-y-6">
      {/* Encabezado con el campus activo */}
      <div className="pb-4 border-b border-[#E3E1DA]">
        <span className="text-xs font-bold uppercase tracking-wider text-[#990000]">
          Estadística por Empleado
        </span>
        <h1 className="text-2xl font-medium text-[#262624] tracking-tight font-sans mt-0.5">
          Personal del Campus {campus.name}
        </h1>
        <p className="text-sm text-[#6B6A64] mt-1">
          Ranking y desglose de atenciones registradas por cada bibliotecóloga
          de {campus.libraryName}.
        </p>
      </div>

      {/* Filtros: período (ciclo | año | rango libre), módulo y categoría */}
      <section
        data-testid="filtros-personal"
        className="bg-white p-5 rounded-2xl border border-[#E3E1DA] shadow-xs flex flex-wrap items-end gap-4"
      >
        <div>
          <label
            htmlFor="filtro-periodo"
            className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5"
          >
            Período
          </label>
          <select
            id="filtro-periodo"
            value={periodo}
            onChange={(e) =>
              setPeriodo(e.target.value === 'anio' ? 'anio' : e.target.value === 'rango' ? 'rango' : 'ciclo')
            }
            className={claseInput}
          >
            <option value="ciclo">Por ciclo lectivo</option>
            <option value="anio">Anual (I + II ciclo del año)</option>
            <option value="rango">Rango de fechas libre</option>
          </select>
        </div>

        {periodo === 'ciclo' && (
          <div>
            <label
              htmlFor="filtro-ciclo"
              className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5"
            >
              Ciclo lectivo
            </label>
            <select
              id="filtro-ciclo"
              value={cicloId}
              onChange={(e) =>
                setCicloId(e.target.value === '' ? '' : Number(e.target.value))
              }
              className={claseInput}
            >
              {ciclos.map((c) => (
                <option key={c.id} value={c.id}>
                  {cycleName(c.anio, c.numero)}
                </option>
              ))}
            </select>
          </div>
        )}

        {periodo === 'anio' && (
          <div>
            <label
              htmlFor="filtro-anio"
              className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5"
            >
              Año lectivo
            </label>
            <select
              id="filtro-anio"
              value={anio}
              onChange={(e) =>
                setAnio(e.target.value === '' ? '' : Number(e.target.value))
              }
              className={claseInput}
            >
              <option value="">Todos los años</option>
              {anios.map((a) => (
                <option key={a} value={a}>
                  Año lectivo {a}
                </option>
              ))}
            </select>
          </div>
        )}

        {periodo === 'rango' && (
          <div className="flex items-end gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5">
                Desde
              </label>
              <input
                type="date"
                value={desde}
                onChange={(e) => setDesde(e.target.value)}
                aria-label="Fecha inicial del rango"
                className={claseInput}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5">
                Hasta
              </label>
              <input
                type="date"
                value={hasta}
                onChange={(e) => setHasta(e.target.value)}
                aria-label="Fecha final del rango"
                className={claseInput}
              />
            </div>
          </div>
        )}

        <div>
          <label
            htmlFor="filtro-modulo"
            className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5"
          >
            Módulo
          </label>
          <select
            id="filtro-modulo"
            value={moduloId}
            onChange={(e) =>
              setModuloId(e.target.value === '' ? '' : Number(e.target.value))
            }
            className={claseInput}
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
          <label
            htmlFor="filtro-categoria"
            className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5"
          >
            Categoría del servicio
          </label>
          <select
            id="filtro-categoria"
            value={categoriaId}
            onChange={(e) =>
              setCategoriaId(e.target.value === '' ? '' : Number(e.target.value))
            }
            className={claseInput}
          >
            <option value="">Todas las categorías</option>
            {categoriasFiltro.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      </section>

      {rangoInvalido && (
        <div
          data-testid="rango-invalido"
          className="p-3 bg-[#FDECEC] border border-[#E17475] text-[#7B0E0F] text-xs rounded-lg"
        >
          La fecha inicial no puede ser posterior a la final: corregí el rango
          para volver a consultar.
        </div>
      )}

      {/* Toggle General / Personal específico */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div
          role="group"
          aria-label="Modo de la estadística por empleado"
          className="inline-flex items-center rounded-xl border border-[#E3E1DA] bg-[#F7F6F4] p-1"
        >
          <button
            type="button"
            aria-pressed={modo === 'general'}
            onClick={() => setModo('general')}
            data-testid="toggle-general"
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#990000] ${
              modo === 'general'
                ? 'bg-white text-[#990000] shadow-xs'
                : 'text-[#585757] hover:text-[#262624]'
            }`}
          >
            General
          </button>
          <button
            type="button"
            aria-pressed={modo === 'personal'}
            onClick={() => setModo('personal')}
            data-testid="toggle-personal"
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#990000] ${
              modo === 'personal'
                ? 'bg-white text-[#990000] shadow-xs'
                : 'text-[#585757] hover:text-[#262624]'
            }`}
          >
            Personal específico
          </button>
        </div>

        {modo === 'personal' && empleadaSeleccionada && (
          <p className="text-xs text-[#6B6A64]">
            Desglose de{' '}
            <strong className="text-[#262624]">
              {empleadaSeleccionada.nombreCompleto}
            </strong>
          </p>
        )}
      </div>

      {/* ---------------- Modo General: ranking ---------------- */}
      {modo === 'general' && (
        <>
          <section
            data-testid="panel-ranking"
            className="bg-white border border-[#E3E1DA] rounded-2xl p-6 shadow-xs"
          >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-[#262624] uppercase tracking-wider">
              Ranking del personal
            </h3>
            {estadoRanking === 'cargando' && (
              <span className="text-xs text-[#6B6A64]">Cargando datos...</span>
            )}
          </div>

          {estadoRanking === 'cargando' ? (
            <div className="space-y-2" data-testid="skeleton-ranking">
              <SkeletonCaja className="h-8 w-full" />
              <SkeletonCaja className="h-8 w-3/4" />
            </div>
          ) : estadoRanking === 'error' ? (
            <p className="text-sm font-semibold text-[#990000]">
              No se pudieron cargar los datos del personal.
            </p>
          ) : estadoRanking === 'vacio' ? (
            <div className="rounded-xl border border-dashed border-[#E3E1DA] bg-[#F7F6F4]/70 px-4 py-6 text-center">
              <p className="text-sm font-medium text-[#262624]">
                Sin personal registrado
              </p>
              <p className="mt-1 text-xs text-[#6B6A64]" data-testid="ranking-vacio">
                Todavía no hay atenciones registradas en este período.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#990000] text-white text-[11px] uppercase tracking-wider">
                    <th className="px-3 py-2.5 font-semibold rounded-l-lg">
                      #
                    </th>
                    <th className="px-3 py-2.5 font-semibold">Empleada</th>
                    <th className="px-3 py-2.5 font-semibold text-right">
                      Atenciones
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-right">
                      Personas
                    </th>
                    <th className="px-3 py-2.5 font-semibold text-right rounded-r-lg">
                      Tiempo
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((empleado, indice) => (
                    <tr
                      key={empleado.usuarioId}
                      data-testid="fila-ranking"
                      aria-selected={seleccion === empleado.usuarioId}
                      className={`border-b border-[#E3E1DA] text-xs ${
                        seleccion === empleado.usuarioId
                          ? 'bg-[#990000]/5 font-semibold'
                          : 'hover:bg-[#F7F6F4]/60'
                      }`}
                    >
                      <td className="px-3 py-2.5 font-mono text-[#6B6A64]">
                        {indice + 1}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className="text-[#262624]">
                          {empleado.nombreCompleto}
                        </span>
                        {!empleado.activo && (
                          <span className="ml-2 inline-flex rounded-full border border-[#E3E1DA] bg-[#F7F6F4] px-2 py-0.5 text-[10px] font-semibold text-[#6B6A64]">
                            Inactiva
                          </span>
                        )}
                        {seleccion === empleado.usuarioId && (
                          <span className="ml-2 inline-flex rounded-full bg-[#990000] px-2 py-0.5 text-[10px] font-semibold text-white">
                            Seleccionada
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[#990000] font-semibold">
                        {empleado.atenciones.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[#034991]">
                        {empleado.personas.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[#585757]">
                        {formatearDuracion(empleado.tiempo)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-[#F7F6F4] font-bold text-xs">
                    <td className="px-3 py-2.5 rounded-l-lg" colSpan={2}>
                      TOTAL
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[#990000]">
                      {totalRanking.atenciones.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[#034991]">
                      {totalRanking.personas.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono rounded-r-lg">
                      {formatearDuracion(totalRanking.tiempo)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
          </section>

          {/* Gráfica de barras del ranking: atenciones y personas por empleada */}
          <section
            data-testid="grafico-ranking"
            className="bg-white border border-[#E3E1DA] rounded-2xl p-6 shadow-xs"
          >
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-[#262624] uppercase tracking-wider">
                Atenciones por empleada
              </h3>
              <p className="text-xs text-[#6B6A64] mt-0.5">
                Comparación de atenciones y personas registradas con los
                filtros activos.
              </p>
            </div>

            {estadoRanking === 'cargando' ? (
              <SkeletonCaja
                testId="skeleton-grafico-ranking"
                className="h-72 w-full"
              />
            ) : estadoRanking === 'error' ? (
              <p className="text-sm font-semibold text-[#990000]">
                No se pudieron cargar los datos del personal.
              </p>
            ) : datosBarrasRanking.length === 0 ? (
              <p
                data-testid="grafico-ranking-vacio"
                className="text-xs text-[#6B6A64] py-6 text-center"
              >
                Sin datos para mostrar la gráfica.
              </p>
            ) : (
              <GraficaBarras datos={datosBarrasRanking} />
            )}
          </section>
        </>
      )}

      {/* ---------------- Modo Personal específico ---------------- */}
      {modo === 'personal' && (
        <>
          {/* Tarjetas del personal: la seleccionada resaltada, el resto atenuadas */}
          <section
            data-testid="tarjetas-personal"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3"
          >
            {estadoRanking === 'cargando' ? (
              <SkeletonCaja testId="skeleton-tarjetas" className="h-24 w-full" />
            ) : (
              ranking.map((empleado) => {
                const activa = seleccion === empleado.usuarioId;
                return (
                  <button
                    key={empleado.usuarioId}
                    type="button"
                    aria-pressed={activa}
                    onClick={() => setSeleccion(empleado.usuarioId)}
                    data-testid="tarjeta-empleada"
                    className={`text-left rounded-xl border p-4 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#990000] ${
                      activa
                        ? 'border-[#990000] bg-white shadow-xs ring-1 ring-[#990000]'
                        : 'border-[#E3E1DA] bg-[#F7F6F4]/60 opacity-60 hover:opacity-90'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#262624] truncate">
                        {empleado.nombreCompleto}
                      </span>
                      {!empleado.activo && (
                        <span className="shrink-0 inline-flex rounded-full border border-[#E3E1DA] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#6B6A64]">
                          Inactiva
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-3 text-xs font-mono">
                      <span className="text-[#990000] font-bold">
                        {empleado.atenciones.toLocaleString()} atenciones
                      </span>
                      <span className="text-[#585757]">
                        {formatearDuracion(empleado.tiempo)}
                      </span>
                    </div>
                    {activa && (
                      <span className="mt-2 inline-flex rounded-full bg-[#990000] px-2 py-0.5 text-[10px] font-semibold text-white">
                        Seleccionada
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </section>

          {/* Desglose de la empleada seleccionada */}
          <section
            data-testid="panel-desglose"
            className="bg-white border border-[#E3E1DA] rounded-2xl p-6 shadow-xs"
          >
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-[#262624] uppercase tracking-wider">
                Desglose por categoría
                {empleadaSeleccionada && (
                  <span className="ml-2 text-[#990000] normal-case tracking-normal">
                    · {empleadaSeleccionada.nombreCompleto}
                  </span>
                )}
              </h3>
              {estadoDesglose === 'cargando' && (
                <span className="text-xs text-[#6B6A64]">Cargando datos...</span>
              )}
            </div>

            {estadoDesglose === 'cargando' ? (
              <div className="space-y-2" data-testid="skeleton-desglose">
                <SkeletonCaja className="h-8 w-full" />
                <SkeletonCaja className="h-8 w-3/4" />
              </div>
            ) : estadoDesglose === 'error' ? (
              <p className="text-sm font-semibold text-[#990000]">
                No se pudieron cargar los datos de la empleada.
              </p>
            ) : estadoDesglose === 'vacio' || !desglose ? (
              <div className="rounded-xl border border-dashed border-[#E3E1DA] bg-[#F7F6F4]/70 px-4 py-6 text-center">
                <p className="text-sm font-medium text-[#262624]">
                  Sin registros en este período
                </p>
                <p className="mt-1 text-xs text-[#6B6A64]" data-testid="desglose-vacio">
                  Esta empleada no registró atenciones con los filtros activos.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#990000] text-white text-[11px] uppercase tracking-wider">
                      <th className="px-3 py-2.5 font-semibold rounded-l-lg">
                        Categoría
                      </th>
                      <th className="px-3 py-2.5 font-semibold">Módulo</th>
                      <th className="px-3 py-2.5 font-semibold text-right">
                        Atenciones
                      </th>
                      <th className="px-3 py-2.5 font-semibold text-right">
                        Personas
                      </th>
                      <th className="px-3 py-2.5 font-semibold text-right rounded-r-lg">
                        Tiempo
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {desglose.filas.map((fila) => (
                      <tr
                        key={`${fila.categoriaId}-${fila.origen}`}
                        data-testid="fila-desglose"
                        className="border-b border-[#E3E1DA] text-xs hover:bg-[#F7F6F4]/60"
                      >
                        <td className="px-3 py-2.5">
                          <span className="text-[#262624] font-medium">
                            {fila.categoriaNombre}
                          </span>
                          {fila.categoriaPadreNombre && (
                            <span className="block text-[11px] text-[#6B6A64]">
                              {fila.categoriaPadreNombre}
                            </span>
                          )}
                          {fila.origen === 'capacitacion' && (
                            <span className="mt-1 inline-flex rounded-full bg-[#034991]/10 px-2 py-0.5 text-[10px] font-semibold text-[#034991]">
                              Capacitación asistida
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-[#585757]">
                          {fila.moduloNombre}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-[#262624] font-semibold">
                          {fila.total.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-[#034991]">
                          {fila.totalPersonas > 0
                            ? fila.totalPersonas.toLocaleString()
                            : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-[#585757]">
                          {fila.totalTiempo > 0
                            ? formatearDuracion(fila.totalTiempo)
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    {desglose.subtotales.map((subtotal) => (
                      <tr
                        key={`subtotal-${subtotal.moduloNombre}`}
                        data-testid="fila-subtotal"
                        className="bg-[#990000]/5 text-xs font-semibold"
                      >
                        <td className="px-3 py-2" colSpan={2}>
                          Subtotal {subtotal.moduloNombre}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-[#990000]">
                          {subtotal.total.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-[#034991]">
                          {subtotal.totalPersonas > 0
                            ? subtotal.totalPersonas.toLocaleString()
                            : '—'}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">
                          {subtotal.totalTiempo > 0
                            ? formatearDuracion(subtotal.totalTiempo)
                            : '—'}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-[#F7F6F4] font-bold text-xs">
                      <td className="px-3 py-2.5 rounded-l-lg" colSpan={2}>
                        TOTAL GENERAL
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[#990000]">
                        {desglose.totalGeneral.total.toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono text-[#034991]">
                        {desglose.totalGeneral.totalPersonas > 0
                          ? desglose.totalGeneral.totalPersonas.toLocaleString()
                          : '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono rounded-r-lg">
                        {desglose.totalGeneral.totalTiempo > 0
                          ? formatearDuracion(desglose.totalGeneral.totalTiempo)
                          : '—'}
                      </td>
                    </tr>
                </tfoot>
              </table>
            </div>
          )}
          </section>

          {/* Gráfica de barras del desglose: atenciones por categoría */}
          <section
            data-testid="grafico-desglose"
            className="bg-white border border-[#E3E1DA] rounded-2xl p-6 shadow-xs"
          >
            <div className="mb-3">
              <h3 className="text-sm font-semibold text-[#262624] uppercase tracking-wider">
                Atenciones por categoría
                {empleadaSeleccionada && (
                  <span className="ml-2 text-[#990000] normal-case tracking-normal">
                    · {empleadaSeleccionada.nombreCompleto}
                  </span>
                )}
              </h3>
              <p className="text-xs text-[#6B6A64] mt-0.5">
                Distribución de las atenciones y personas registradas por la
                empleada con los filtros activos.
              </p>
            </div>

            {estadoDesglose === 'cargando' ? (
              <SkeletonCaja
                testId="skeleton-grafico-desglose"
                className="h-72 w-full"
              />
            ) : estadoDesglose === 'error' ? (
              <p className="text-sm font-semibold text-[#990000]">
                No se pudieron cargar los datos de la empleada.
              </p>
            ) : datosBarrasDesglose.length === 0 ? (
              <p
                data-testid="grafico-desglose-vacio"
                className="text-xs text-[#6B6A64] py-6 text-center"
              >
                Sin datos para mostrar la gráfica.
              </p>
            ) : (
              <GraficaBarras datos={datosBarrasDesglose} />
            )}
          </section>
        </>
      )}
    </div>
  );
};
