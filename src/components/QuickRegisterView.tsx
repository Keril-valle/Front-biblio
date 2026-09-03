import React, { useEffect, useState } from 'react';
import { CAMPUSES } from '../data/campuses';
import { api } from '../api/client';
import {
  AttendanceRecord,
  CampusId,
  CategoriaDto,
  CicloDto,
  ModuloDto,
  UserSession,
} from '../types';

interface QuickRegisterViewProps {
  session: UserSession;
}

export const QuickRegisterView: React.FC<QuickRegisterViewProps> = ({ session }) => {
  const campus = CAMPUSES[session.campus];

  const [modulos, setModulos] = useState<ModuloDto[]>([]);
  const [categorias, setCategorias] = useState<CategoriaDto[]>([]);
  const [ciclos, setCiclos] = useState<CicloDto[]>([]);
  const [cicloActual, setCicloActual] = useState<CicloDto | null>(null);

  const [moduloId, setModuloId] = useState<number | null>(null);
  const [categoriaId, setCategoriaId] = useState<number | null>(null);
  const [cicloId, setCicloId] = useState<number | null>(null);
  const [count, setCount] = useState<number>(1);
  const [cantidadSecundaria, setCantidadSecundaria] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const categoriaSeleccionada = categorias.find((c) => c.id === categoriaId);

  // Módulos que tienen al menos una categoría activa para registrar.
  const modulosConCategorias = modulos.filter((m) =>
    categorias.some((c) => c.moduloId === m.id && c.activo),
  );

  // Categorías visibles: solo las activas del módulo seleccionado.
  const categoriasDelModulo = categorias.filter(
    (c) => c.activo && c.moduloId === moduloId,
  );

  useEffect(() => {
    let mounted = true;
    Promise.all([api.categorias(), api.ciclos(), api.modulos()])
      .then(([cats, cic, mods]) => {
        if (!mounted) return;
        setCategorias(cats);
        setCiclos(cic);
        setModulos(mods);
        if (cic.length > 0) setCicloId(cic[0].id);
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
          userType: r.cantidadSecundaria
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (!categoriaId || !cicloId) {
      setErrorMsg('Seleccione una categoría y un ciclo lectivo.');
      return;
    }

    setIsLoading(true);
    try {
      await api.crearRegistro({
        categoriaId,
        cicloId,
        cantidad: Math.max(1, count),
        cantidadSecundaria: cantidadSecundaria ? Number(cantidadSecundaria) : undefined,
        observaciones: notes.trim() || undefined,
      });

      const nuevoRecord: AttendanceRecord = {
        id: `rec-${Date.now()}`,
        date: new Date().toLocaleDateString('es-CR'),
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        serviceType: categoriaSeleccionada?.nombre ?? '',
        userType: cantidadSecundaria
          ? `${cantidadSecundaria} personas atendidas`
          : 'Atención directa',
        count: Math.max(1, count),
        campus: session.campus,
        registeredBy: session.name,
        notes: notes.trim(),
      };

      setRecords([nuevoRecord, ...records]);
      setSuccessMsg(`✓ Registro guardado correctamente (${categoriaSeleccionada?.nombre} — ${count}).`);
      setNotes('');
      setCount(1);
      setCantidadSecundaria('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al guardar.';
      setErrorMsg(message || 'No se pudo guardar el registro.');
    } finally {
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

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center justify-between">
              <span>{successMsg}</span>
              <span className="text-[10px] uppercase font-bold text-emerald-600">Guardado</span>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Ciclo Lectivo */}
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

            {/* Module Selection */}
            <div>
              <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-2">
                1. Módulo de Servicio <span className="text-[#990000]">*</span>
              </label>
              {modulosConCategorias.length === 0 ? (
                <p className="text-xs text-[#6B6A64] italic">
                  No hay módulos con categorías activas disponibles.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {modulosConCategorias.map((mod) => (
                    <button
                      type="button"
                      key={mod.id}
                      onClick={() => {
                        setModuloId(mod.id);
                        setCategoriaId(null);
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
              ) : categoriasDelModulo.length === 0 ? (
                <p className="text-xs text-[#6B6A64] italic px-1 py-3 bg-[#F7F6F4] rounded-lg">
                  Este módulo no tiene categorías activas.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                  {categoriasDelModulo.map((cat) => (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setCategoriaId(cat.id)}
                      className={`p-3 rounded-lg text-xs text-left font-medium border transition-colors ${
                        categoriaId === cat.id
                          ? 'border-[#990000] bg-[#990000]/10 text-[#990000] font-semibold'
                          : 'border-[#E3E1DA] bg-white text-[#262624] hover:border-[#990000]'
                      }`}
                    >
                      <span className="block font-semibold">{cat.nombre}</span>
                      <span className="text-[10px] text-[#6B6A64] block mt-0.5">
                        {cat.tipoMetrica === 'doble' ? 'Cantidad + Personas' : 'Cantidad'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Count & Notes Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

              {categoriaSeleccionada?.tipoMetrica === 'doble' && (
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

              <div className={categoriaSeleccionada?.tipoMetrica === 'doble' ? '' : 'sm:col-span-2'}>
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
              Historial de las últimas atenciones registradas en {campus.libraryName}:
            </p>

            {records.length === 0 ? (
              <p className="text-xs text-[#6B6A64] italic">
                Todavía no hay registros para mostrar.
              </p>
            ) : (
              <div className="space-y-3">
                {records.map((rec) => (
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
