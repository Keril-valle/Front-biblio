import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { CicloDto, KpisDto, PorCategoriaDto, UserSession } from '../types';

interface ReportsViewProps {
  session: UserSession;
}

interface ReportRow {
  categoria: string;
  modulo: string;
  tipo: string;
  cantidad: number;
  personas: number;
}

const SEDE_NOMBRE: Record<string, string> = {
  nicoya: 'Biblioteca Nayuribe (Nicoya)',
  liberia: 'Biblioteca Rose Marie Ruiz Bravo (Liberia)',
};

const nombreCiclo = (c: CicloDto) =>
  `${c.numero === 1 ? 'I' : 'II'} Ciclo Lectivo ${c.anio} (${c.fechaInicio} — ${c.fechaFin})`;

const nombreCicloCorto = (c: CicloDto) =>
  `${c.numero === 1 ? 'I' : 'II'} Ciclo ${c.anio}`;

export const ReportsView: React.FC<ReportsViewProps> = ({ session }) => {
  const isJefa = session.role === 'jefa';
  // Bibliotecóloga: su sede está forzada por el backend.
  const [selectedCampusScope, setSelectedCampusScope] = useState<
    'nicoya' | 'liberia' | 'ambas'
  >(isJefa ? 'ambas' : session.campus);
  const [periodo, setPeriodo] = useState<'ciclo' | 'anual'>('ciclo');
  const [ciclos, setCiclos] = useState<CicloDto[]>([]);
  const [cicloId, setCicloId] = useState<number | ''>('');
  const [anio, setAnio] = useState<number | ''>('');
  const [kpis, setKpis] = useState<KpisDto>({ totalAtenciones: 0, totalPersonas: 0 });
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [withLetterhead, setWithLetterhead] = useState(true);
  const [exportSuccess, setExportSuccess] = useState('');

  useEffect(() => {
    api
      .ciclos()
      .then((cic) => {
        setCiclos(cic);
        if (cic.length > 0) {
          setCicloId(cic[0].id);
          const anios = Array.from(new Set(cic.map((c) => c.anio))).sort(
            (a, b) => a - b,
          );
          if (anios.length > 0) setAnio(anios[anios.length - 1]);
        }
      })
      .catch(() => undefined);
  }, []);

  // Años lectivos disponibles (para el modo "anual").
  const anios: number[] = Array.from(new Set<number>(ciclos.map((c) => c.anio))).sort(
    (a: number, b: number) => a - b,
  );

  const effectiveSedeId =
    selectedCampusScope === 'ambas'
      ? undefined
      : selectedCampusScope === 'nicoya'
        ? 1
        : 2;

  useEffect(() => {
    setLoading(true);
    setExportSuccess('');

    // Modo anual: datos agregados por año lectivo (I + II ciclo).
    if (periodo === 'anual') {
      const anioSeleccionado = anio === '' ? undefined : Number(anio);
      api
        .porAnio(undefined, effectiveSedeId, anioSeleccionado)
        .then((data) => {
          setRows(
            data.map((d) => ({
              categoria: d.categoriaNombre,
              modulo: d.moduloNombre,
              tipo: d.totalPersonas > 0 ? 'Cantidad + Personas' : 'Cantidad',
              cantidad: d.total,
              personas: d.totalPersonas,
            })),
          );
          const totalAtenciones = data.reduce((acc, d) => acc + d.total, 0);
          const totalPersonas = data.reduce(
            (acc, d) => acc + d.totalPersonas,
            0,
          );
          setKpis({ totalAtenciones, totalPersonas });
        })
        .catch(() => {
          setRows([]);
          setKpis({ totalAtenciones: 0, totalPersonas: 0 });
        })
        .finally(() => setLoading(false));
      return;
    }

    if (cicloId === '') return;
    const cid = Number(cicloId);
    api
      .kpis(cid, effectiveSedeId)
      .then(setKpis)
      .catch(() => undefined);

    api
      .porCategoria(cid, undefined, effectiveSedeId)
      .then((data) =>
        setRows(
          data.map((d: PorCategoriaDto) => ({
            categoria: d.categoriaNombre,
            modulo: d.moduloNombre,
            tipo: d.totalPersonas > 0 ? 'Cantidad + Personas' : 'Cantidad',
            cantidad: d.total,
            personas: d.totalPersonas,
          })),
        ),
      )
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [periodo, cicloId, anio, selectedCampusScope]);

  const scopeLabel =
    selectedCampusScope === 'ambas'
      ? 'Campus Regional Chorotega (Nicoya + Liberia)'
      : SEDE_NOMBRE[selectedCampusScope];

  const cicloSeleccionado = ciclos.find((c) => c.id === cicloId);
  const periodoLabel =
    periodo === 'anual'
      ? anio === ''
        ? 'Todos los años lectivos'
        : `Año Lectivo ${anio}`
      : cicloSeleccionado
        ? nombreCicloCorto(cicloSeleccionado)
        : 'Registros correspondientes';
  const totalAtenciones = rows.reduce((acc, r) => acc + r.cantidad, 0);

  const descargarReporte = async (formato: 'pdf' | 'excel') => {
    try {
      setExportSuccess('');
      const { contenido, nombre } = await api.exportarReporte({
        formato,
        cicloId: periodo === 'ciclo' && cicloId !== '' ? Number(cicloId) : undefined,
        anio: periodo === 'anual' && anio !== '' ? Number(anio) : undefined,
        sedeId: effectiveSedeId,
        membrete: withLetterhead,
      });
      const url = URL.createObjectURL(contenido);
      const a = document.createElement('a');
      a.href = url;
      a.download = nombre;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportSuccess(
        `¡Reporte ${formato.toUpperCase()} descargado correctamente!`,
      );
    } catch {
      setExportSuccess('No se pudo generar el reporte. Intentalo de nuevo.');
    }
  };

  const handleExportExcel = () => descargarReporte('excel');

  const handleExportPdf = () => descargarReporte('pdf');

  return (
    <div className="w-full space-y-6">
      {/* Page Header */}
      <div className="pb-4 border-b border-[#E3E1DA]">
        <h1 className="text-2xl font-medium text-[#262624] tracking-tight font-sans">
          Reportes y Exportables Institucionales
        </h1>
        <p className="text-sm text-[#6B6A64] mt-1">
          Generá consolidados estadísticos oficiales para informes de gestión, acreditación o toma de decisiones.
        </p>
      </div>

      {/* Scope Selector Card - Highlighted for Jefa */}
      <div className="bg-white p-6 rounded-2xl border border-[#E3E1DA] shadow-xs space-y-5">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#990000]" />
          <h2 className="text-base font-medium text-[#262624]">
            1. Selección de Alcance de Campus
          </h2>
        </div>

        {/* Explicit Campus Selector Radio Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              id: 'nicoya' as const,
              title: 'Campus Nicoya',
              desc: 'Biblioteca Nayuribe',
              badge: 'Individual',
              enabled: isJefa || session.campus === 'nicoya',
            },
            {
              id: 'liberia' as const,
              title: 'Campus Liberia',
              desc: 'Biblioteca Rose Marie Ruiz Bravo',
              badge: 'Individual',
              enabled: isJefa || session.campus === 'liberia',
            },
            {
              id: 'ambas' as const,
              title: 'Ambos Campus (Consolidado)',
              desc: 'Campus Regional Chorotega completo',
              badge: 'Consolidado Institucional',
              enabled: isJefa,
            },
          ].map((item) => {
            const isSelected = selectedCampusScope === item.id;
            return (
              <div
                key={item.id}
                onClick={() => item.enabled && setSelectedCampusScope(item.id)}
                className={`p-4 rounded-xl border transition-all duration-200 ${
                  isSelected
                    ? 'border-[#990000] bg-[#990000]/5 ring-1 ring-[#990000]'
                    : item.enabled
                      ? 'border-[#E3E1DA] bg-white hover:border-[#990000] cursor-pointer'
                      : 'border-[#E3E1DA] bg-[#F7F6F4]/60 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      isSelected
                        ? 'bg-[#990000] text-white'
                        : 'bg-[#F7F6F4] text-[#585757]'
                    }`}
                  >
                    {item.badge}
                  </span>
                  <input
                    type="radio"
                    name="campusScope"
                    checked={isSelected}
                    disabled={!item.enabled}
                    onChange={() => item.enabled && setSelectedCampusScope(item.id)}
                    className="accent-[#990000]"
                  />
                </div>
                <h3 className="text-sm font-semibold text-[#262624]">{item.title}</h3>
                <p className="text-xs text-[#6B6A64] mt-0.5">{item.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Additional Filters */}
        <div className="pt-4 border-t border-[#E3E1DA] grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5">
              Período de Reporte
            </label>
            <select
              value={periodo}
              onChange={(e) =>
                setPeriodo(e.target.value === 'anual' ? 'anual' : 'ciclo')
              }
              className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E1DA] focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none text-sm bg-white"
            >
              <option value="ciclo">Por Ciclo Lectivo</option>
              <option value="anual">Anual (I + II Ciclo del año)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5">
              {periodo === 'anual' ? 'Año Lectivo' : 'Ciclo Lectivo / Período'}
            </label>
            {periodo === 'anual' ? (
              <select
                value={anio}
                onChange={(e) => setAnio(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E1DA] focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none text-sm bg-white"
              >
                <option value="">Todos los años</option>
                {anios.map((a) => (
                  <option key={a} value={a}>
                    Año Lectivo {a}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={cicloId}
                onChange={(e) => setCicloId(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E1DA] focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none text-sm bg-white"
              >
                {ciclos.map((c) => (
                  <option key={c.id} value={c.id}>
                    {nombreCiclo(c)}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5">
              Membrete Institucional UNA
            </label>
            <label className="flex items-center gap-2 text-sm text-[#585757] cursor-pointer select-none px-3.5 py-2.5 rounded-lg border border-[#E3E1DA] bg-white">
              <input
                type="checkbox"
                checked={withLetterhead}
                onChange={(e) => setWithLetterhead(e.target.checked)}
                className="accent-[#990000] w-4 h-4"
              />
              <span>Incluir membrete oficial en el reporte</span>
            </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-4 border-t border-[#E3E1DA] flex flex-wrap items-center justify-between gap-4">
          <p className="text-xs text-[#6B6A64]">
            Alcance seleccionado: <strong className="text-[#990000]">{scopeLabel}</strong>
          </p>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportPdf}
              disabled={loading || rows.length === 0}
              className="px-5 py-2.5 bg-[#990000] hover:bg-[#CD1719] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Descargar PDF Oficial
            </button>

            <button
              onClick={handleExportExcel}
              disabled={loading || rows.length === 0}
              className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Exportar Excel (.xlsx)
            </button>
          </div>
        </div>

        {exportSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
            <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
            <span>{exportSuccess}</span>
          </div>
        )}
      </div>

      {/* Preview Table of Stats */}
      <div className="bg-white border border-[#E3E1DA] rounded-xl p-6 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[#262624] uppercase tracking-wider">
            Previsualización de Datos Consolidados
          </h3>
          {loading && <span className="text-xs text-[#6B6A64]">Cargando datos...</span>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-[#F7F6F4] rounded-xl border border-[#E3E1DA]">
            <span className="text-xs text-[#585757]">Atenciones Totales en Período</span>
            <p className="text-2xl font-bold text-[#990000] font-mono mt-1">
              {kpis.totalAtenciones.toLocaleString()}
            </p>
            <p className="text-[11px] text-[#6B6A64]">
              {periodoLabel}
            </p>
          </div>
          <div className="p-4 bg-[#F7F6F4] rounded-xl border border-[#E3E1DA]">
            <span className="text-xs text-[#585757]">Personas Atendidas</span>
            <p className="text-2xl font-bold text-[#262624] font-mono mt-1">
              {kpis.totalPersonas.toLocaleString()}
            </p>
            <p className="text-[11px] text-[#6B6A64]">Capacitaciones y actividades con personas</p>
          </div>
          <div className="p-4 bg-[#F7F6F4] rounded-xl border border-[#E3E1DA]">
            <span className="text-xs text-[#585757]">Categorías con Registros</span>
            <p className="text-2xl font-bold text-[#262624] font-mono mt-1">{rows.length}</p>
            <p className="text-[11px] text-[#6B6A64]">Tipos de servicios atendidos</p>
          </div>
        </div>

        {/* Detailed Table */}
        <div className="mt-5 overflow-x-auto">
          {rows.length === 0 && !loading ? (
            <p className="text-xs text-[#6B6A64] text-center py-6">
              No hay registros para el período y campus seleccionados.
            </p>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#990000] text-white text-[11px] uppercase tracking-wider">
                  <th className="px-3 py-2.5 font-semibold rounded-l-lg">Categoría</th>
                  <th className="px-3 py-2.5 font-semibold">Módulo</th>
                  <th className="px-3 py-2.5 font-semibold">Tipo de Métrica</th>
                  <th className="px-3 py-2.5 font-semibold text-right">Cantidad</th>
                  <th className="px-3 py-2.5 font-semibold text-right rounded-r-lg">Personas</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-[#E3E1DA] text-xs hover:bg-[#990000]/5"
                  >
                    <td className="px-3 py-2.5 font-medium text-[#262624]">{r.categoria}</td>
                    <td className="px-3 py-2.5 text-[#585757]">{r.modulo}</td>
                    <td className="px-3 py-2.5 text-[#585757]">{r.tipo}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-[#262624]">
                      {r.cantidad.toLocaleString()}
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[#585757]">
                      {r.personas > 0 ? r.personas.toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-[#F7F6F4] font-bold text-xs">
                  <td className="px-3 py-2.5 rounded-l-lg" colSpan={3}>
                    TOTAL
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono">
                    {totalAtenciones.toLocaleString()}
                  </td>
                  <td className="px-3 py-2.5 text-right font-mono rounded-r-lg">
                    {kpis.totalPersonas.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
