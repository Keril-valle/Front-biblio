import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { CicloDto, UserSession } from '../types';

interface CyclesViewProps {
  session: UserSession;
}

export const CyclesView: React.FC<CyclesViewProps> = () => {
  const [cycles, setCycles] = useState<CicloDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [newAnio, setNewAnio] = useState<number>(new Date().getFullYear());
  const [newNumero, setNewNumero] = useState<1 | 2>(1);
  const [newInicio, setNewInicio] = useState('');
  const [newFin, setNewFin] = useState('');

  const load = () => {
    setLoading(true);
    api
      .ciclos()
      .then((c) => setCycles(c))
      .catch(() => setErrorMsg('No se pudieron cargar los ciclos.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newInicio || !newFin) {
      setErrorMsg('Ingrese las fechas de inicio y fin.');
      return;
    }

    try {
      await api.crearCiclo({
        anio: newAnio,
        numero: newNumero,
        fechaInicio: newInicio,
        fechaFin: newFin,
      });
      setSuccessMsg('✓ Ciclo creado correctamente.');
      setNewInicio('');
      setNewFin('');
      load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear.';
      setErrorMsg(message || 'No se pudo crear el ciclo.');
    }
  };

  const cicloNombre = (c: CicloDto) => `${c.numero === 1 ? 'I' : 'II'} Ciclo Lectivo ${c.anio}`;

  return (
    <div className="w-full space-y-6">
      <div className="pb-4 border-b border-[#E3E1DA]">
        <h1 className="text-2xl font-medium text-[#262624] tracking-tight font-sans">
          Configuración de Ciclos Lectivos
        </h1>
        <p className="text-sm text-[#6B6A64] mt-1">
          Definí las fechas oficiales de I y II ciclo lectivo para el Campus Regional Chorotega UNA.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg">{errorMsg}</div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg">{successMsg}</div>
      )}

      {loading ? (
        <p className="text-xs text-[#6B6A64]">Cargando ciclos...</p>
      ) : (
        <div className="space-y-4">
          {cycles.map((cyc) => (
            <div
              key={cyc.id}
              className="p-5 rounded-2xl border bg-white transition-all border-[#E3E1DA]"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-[#990000] uppercase tracking-wider">
                      Año Lectivo {cyc.anio}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-[#262624]">{cicloNombre(cyc)}</h2>
                  <p className="text-xs text-[#6B6A64] mt-1">
                    Inicio: <strong>{cyc.fechaInicio}</strong> — Finalización: <strong>{cyc.fechaFin}</strong>
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#F7F6F4] text-[#585757] border border-[#E3E1DA]">
                    Ciclo {cyc.numero === 1 ? 'I' : 'II'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create new cycle form */}
      <div className="bg-white p-6 rounded-2xl border border-[#E3E1DA] shadow-xs space-y-4">
        <h3 className="text-base font-medium text-[#262624] font-goudy pb-2 border-b border-[#E3E1DA]">
          + Agregar Nuevo Ciclo Lectivo
        </h3>
        <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5">
              Año
            </label>
            <input
              type="number"
              required
              min={2024}
              value={newAnio}
              onChange={(e) => setNewAnio(parseInt(e.target.value) || 2024)}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#E3E1DA] outline-none focus:border-[#990000]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5">
              Ciclo
            </label>
            <select
              value={newNumero}
              onChange={(e) => setNewNumero(Number(e.target.value) as 1 | 2)}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#E3E1DA] outline-none focus:border-[#990000] bg-white"
            >
              <option value={1}>I Ciclo</option>
              <option value={2}>II Ciclo</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5">
              Fecha Inicio
            </label>
            <input
              type="date"
              required
              value={newInicio}
              onChange={(e) => setNewInicio(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#E3E1DA] outline-none focus:border-[#990000]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5">
              Fecha Fin
            </label>
            <input
              type="date"
              required
              value={newFin}
              onChange={(e) => setNewFin(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-lg border border-[#E3E1DA] outline-none focus:border-[#990000]"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#990000] hover:bg-[#CD1719] text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Guardar Ciclo
          </button>
        </form>
      </div>
    </div>
  );
};
