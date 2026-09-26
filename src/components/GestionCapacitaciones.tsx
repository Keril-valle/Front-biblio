import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '../api/client';
import { formatearDuracion, normalizarTiempoAMinutos } from '../utils/duracion';
import type { CategoriaDto } from '../types';

interface GestionCapacitacionesProps {
  moduloId: number;
  /** Se llama después de crear o editar para recargar el catálogo. */
  onCambio: () => void;
  /**
   * Capacitación a editar, puesta por el formulario de registro (el botón
   * "Editar capacitación" que está arriba de los campos). Al terminar se avisa
   * con `onEdicionTerminada` para que el padre limpie el valor.
   */
  capacitacionEnEdicion: CategoriaDto | null;
  onEdicionTerminada: () => void;
}

interface Formulario {
  nombre: string;
  expositor: string;
  institucion: string;
  duracion: string;
  fechaEvento: string;
}

const FORM_VACIO: Formulario = {
  nombre: '',
  expositor: '',
  institucion: '',
  duracion: '',
  fechaEvento: '',
};

/**
 * Cuadrito "+ Agregar capacitación": crea y edita las capacitaciones del
 * módulo Desarrollo Personal desde un modal emergente (mismo patrón que el de
 * "Crear cuenta"), sin tener que desplazarse hasta el formulario.
 *
 * Los cinco datos (nombre, expositor, institución, duración y fecha) se fijan
 * aquí y NO se vuelven a pedir al registrar la asistencia: solo se elige quién
 * la recibió. Solo la jefatura ve el cuadrito: la bibliotecóloga no administra
 * el catálogo.
 *
 * El modal se dibuja en un portal porque este bloque vive dentro del <form> de
 * registro y un <form> anidado es HTML inválido: el navegador no dispararía su
 * onSubmit.
 */
export const GestionCapacitaciones: React.FC<GestionCapacitacionesProps> = ({
  moduloId,
  onCambio,
  capacitacionEnEdicion,
  onEdicionTerminada,
}) => {
  const [abierto, setAbierto] = useState(false);
  const [editando, setEditando] = useState<CategoriaDto | null>(null);
  const [form, setForm] = useState<Formulario>(FORM_VACIO);
  /**
   * Bloqueo síncrono de envío: `setEnviando` no se aplica hasta el siguiente
   * render, así que dos clics seguidos dispararían dos creaciones.
   */
  const enviandoRef = useRef(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  useEffect(() => {
    if (!editando) return;
    setForm({
      nombre: editando.nombre,
      expositor: editando.expositor ?? '',
      institucion: editando.institucion ?? '',
      duracion:
        editando.duracionMinutos != null
          ? formatearDuracion(editando.duracionMinutos)
          : '',
      fechaEvento: editando.fechaEvento
        ? editando.fechaEvento.slice(0, 10)
        : '',
    });
  }, [editando]);

  // El botón "Editar capacitación" vive en el formulario de registro: al
  // pulsarlo el padre pone esta prop y el modal se abre con esos datos.
  useEffect(() => {
    if (!capacitacionEnEdicion) return;
    setError('');
    setEditando(capacitacionEnEdicion);
    setAbierto(true);
  }, [capacitacionEnEdicion]);

  const abrirNuevo = () => {
    setEditando(null);
    setForm(FORM_VACIO);
    setError('');
    setAbierto(true);
  };

  const cerrar = () => {
    setAbierto(false);
    setEditando(null);
    setForm(FORM_VACIO);
    setError('');
    onEdicionTerminada();
  };

  // Escape cierra el modal, como cualquier diálogo.
  useEffect(() => {
    if (!abierto) return;
    const alPulsarEscape = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') cerrar();
    };
    document.addEventListener('keydown', alPulsarEscape);
    return () => document.removeEventListener('keydown', alPulsarEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto]);

  const setCampo = (campo: keyof Formulario, valor: string) =>
    setForm((prev) => ({ ...prev, [campo]: valor }));

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setExito('');

    if (!form.nombre.trim()) return setError('Indique el nombre de la capacitación.');
    if (!form.expositor.trim())
      return setError('Indique el nombre de quien la imparte (expositor).');
    if (!form.institucion.trim())
      return setError('Indique la institución o departamento que la da.');
    if (!normalizarTiempoAMinutos(form.duracion))
      return setError('Indique la duración con formato horas:minutos (ej. 1:30).');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.fechaEvento))
      return setError('Indique la fecha con formato YYYY-MM-DD.');

    if (enviandoRef.current) return;
    enviandoRef.current = true;
    setEnviando(true);
    setError('');
    try {
      const cuerpo = {
        nombre: form.nombre.trim(),
        expositor: form.expositor.trim(),
        institucion: form.institucion.trim(),
        duracionMinutos: normalizarTiempoAMinutos(form.duracion),
        fechaEvento: form.fechaEvento,
      };

      if (editando) {
        await api.actualizarCategoria(editando.id, cuerpo);
        setExito(`✓ Capacitación "${cuerpo.nombre}" actualizada.`);
      } else {
        await api.crearCategoria({
          moduloId,
          ...cuerpo,
          tipoMetrica: 'asistentes',
        });
        setExito(`✓ Capacitación "${cuerpo.nombre}" creada.`);
      }

      onCambio();
      cerrar();
      setTimeout(() => setExito(''), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    } finally {
      enviandoRef.current = false;
      setEnviando(false);
    }
  };

  return (
    <div
      data-testid="agregar-capacitacion"
      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-[#9AB6D3] bg-[#E6EDF4]/40 px-4 py-3"
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold text-[#023366]">
          Capacitaciones del personal
        </p>
        <p className="text-[11px] text-[#585757]">
          Al crearla se fija el expositor, la duración y la fecha; después solo
          se elige quién la recibió.
        </p>
      </div>
      <button
        type="button"
        onClick={abrirNuevo}
        data-testid="boton-agregar-capacitacion"
        className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#034991] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#356DA7] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#034991] focus-visible:ring-offset-1"
      >
        + Agregar capacitación
      </button>

      {exito && (
        <p className="w-full text-xs text-[#023366] bg-[#E6EDF4] border border-[#9AB6D3] rounded-lg px-3 py-2">
          {exito}
        </p>
      )}

      {/* Modal de alta/edición, en portal: ver nota del encabezado. */}
      {abierto &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
            <div
              role="dialog"
              aria-modal="true"
              aria-label={
                editando ? 'Editar capacitación' : 'Nueva capacitación'
              }
              className="w-full max-w-md bg-white border border-[#E3E1DA] rounded-xl shadow-xl overflow-hidden flex flex-col max-h-[92vh]"
            >
              <div className="w-full h-1 bg-[#990000]" />

              <div className="px-5 py-3.5 border-b border-[#E3E1DA] flex items-center justify-between shrink-0">
                <div>
                  <h3 className="text-base font-medium text-[#262624] font-goudy">
                    {editando ? 'Editar capacitación' : 'Nueva capacitación'}
                  </h3>
                  <p className="text-[11px] text-[#6B6A64] mt-0.5">
                    Se fijan expositor, duración y fecha; después solo se elige
                    quién la recibió.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={cerrar}
                  aria-label="Cerrar modal"
                  className="text-[#6B6A64] hover:text-[#262624] p-1 rounded-lg hover:bg-[#F7F6F4] transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <form
                id="form-capacitacion"
                onSubmit={guardar}
                className="flex flex-col min-h-0 overflow-hidden"
              >
                <div className="px-5 py-4 space-y-3.5 overflow-y-auto">
                  {error && (
                    <div className="p-2.5 bg-[#FAE8E8] border border-[#F0B9BA] text-[#901012] text-xs rounded-lg">
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <label className="sm:col-span-2 block text-xs font-semibold text-[#585757] uppercase tracking-wider">
                      Nombre de la capacitación{' '}
                      <span className="text-[#990000]">*</span>
                      <input
                        type="text"
                        value={form.nombre}
                        onChange={(e) => setCampo('nombre', e.target.value)}
                        placeholder="Ej. Taller de APA"
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-[#E3E1DA] focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none text-sm font-normal normal-case tracking-normal"
                      />
                    </label>

                    <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider">
                      Expositor <span className="text-[#990000]">*</span>
                      <input
                        type="text"
                        value={form.expositor}
                        onChange={(e) => setCampo('expositor', e.target.value)}
                        placeholder="Ej. Ana Rodríguez"
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-[#E3E1DA] focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none text-sm font-normal normal-case tracking-normal"
                      />
                    </label>

                    <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider">
                      Institución o departamento{' '}
                      <span className="text-[#990000]">*</span>
                      <input
                        type="text"
                        value={form.institucion}
                        onChange={(e) => setCampo('institucion', e.target.value)}
                        placeholder="Ej. Departamento de Biblioteca"
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-[#E3E1DA] focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none text-sm font-normal normal-case tracking-normal"
                      />
                    </label>

                    <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider">
                      Duración (hh:mm) <span className="text-[#990000]">*</span>
                      <input
                        type="text"
                        value={form.duracion}
                        onChange={(e) => setCampo('duracion', e.target.value)}
                        placeholder="Ej. 1:30"
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-[#E3E1DA] focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none text-sm font-mono font-normal tracking-normal"
                      />
                    </label>

                    <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider">
                      Fecha <span className="text-[#990000]">*</span>
                      <input
                        type="date"
                        value={form.fechaEvento}
                        onChange={(e) => setCampo('fechaEvento', e.target.value)}
                        className="mt-1 w-full px-3 py-2 rounded-lg border border-[#E3E1DA] focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none text-sm font-normal normal-case tracking-normal"
                      />
                    </label>
                  </div>
                </div>

                {/* Pie fijo: no se desplaza con el formulario */}
                <div className="px-5 py-3 border-t border-[#E3E1DA] flex items-center justify-end gap-2 shrink-0 bg-[#FCFCFB]">
                  <button
                    type="submit"
                    disabled={enviando}
                    className="px-4 py-2 bg-[#990000] hover:bg-[#CD1719] active:bg-[#A41214] text-white text-xs font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#990000] focus:ring-offset-2 disabled:opacity-70"
                  >
                    {enviando
                      ? 'Guardando…'
                      : editando
                        ? 'Guardar cambios'
                        : 'Crear capacitación'}
                  </button>
                  <button
                    type="button"
                    onClick={cerrar}
                    className="px-3 py-2 text-xs font-semibold text-[#585757] hover:text-[#262624] transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
};
