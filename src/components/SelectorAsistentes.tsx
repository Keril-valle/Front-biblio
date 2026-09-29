import React, { useMemo, useState } from 'react';
import type { UsuarioBasicoDto } from '../types';

interface SelectorAsistentesProps {
  usuarios: UsuarioBasicoDto[];
  seleccionados: string[];
  onChange: (ids: string[]) => void;
}

/**
 * Selector múltiple de los empleados que recibieron una capacitación.
 *
 * Solo lista usuarios activos del campus de la sesión (el backend lo acota en
 * `GET /usuarios/basicos`): se puede elegir varios de una vez o solo uno.
 */
export const SelectorAsistentes: React.FC<SelectorAsistentesProps> = ({
  usuarios,
  seleccionados,
  onChange,
}) => {
  const [busqueda, setBusqueda] = useState('');

  const filtrados = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return usuarios;
    return usuarios.filter((u) =>
      u.nombreCompleto.toLowerCase().includes(termino),
    );
  }, [usuarios, busqueda]);

  const alternar = (id: string) => {
    onChange(
      seleccionados.includes(id)
        ? seleccionados.filter((actual) => actual !== id)
        : [...seleccionados, id],
    );
  };

  const nombreDe = (id: string) =>
    usuarios.find((u) => u.id === id)?.nombreCompleto ?? id;

  return (
    <div data-testid="selector-asistentes">
      <div className="flex items-center justify-between mb-2 gap-2">
        <label
          htmlFor="buscar-asistente"
          className="block text-xs font-semibold text-[#585757] uppercase tracking-wider"
        >
          ¿Quién la recibió? <span className="text-[#990000]">*</span>
        </label>
        <span
          data-testid="contador-asistentes"
          className="text-[11px] font-mono font-semibold text-[#034991] whitespace-nowrap"
        >
          {seleccionados.length} seleccionado
          {seleccionados.length === 1 ? '' : 's'}
        </span>
      </div>

      <input
        id="buscar-asistente"
        type="search"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar empleado por nombre…"
        className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E1DA] focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none text-sm mb-2"
      />

      {usuarios.length === 0 ? (
        <p className="text-xs text-[#6B6A64] italic px-1 py-3 bg-[#F7F6F4] rounded-lg">
          No hay usuarios activos en este campus.
        </p>
      ) : filtrados.length === 0 ? (
        <p className="text-xs text-[#6B6A64] italic px-1 py-3 bg-[#F7F6F4] rounded-lg">
          Ningún empleado coincide con "{busqueda}".
        </p>
      ) : (
        <ul className="max-h-48 overflow-y-auto pr-1 divide-y divide-[#E3E1DA] border border-[#E3E1DA] rounded-lg bg-white">
          {filtrados.map((usuario) => {
            const activo = seleccionados.includes(usuario.id);
            return (
              <li key={usuario.id}>
                <label
                  className={`flex items-center gap-2.5 px-3 py-2 text-xs cursor-pointer transition-colors ${
                    activo
                      ? 'bg-[#034991]/[0.06] font-semibold text-[#034991]'
                      : 'text-[#262624] hover:bg-[#F7F6F4]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={activo}
                    onChange={() => alternar(usuario.id)}
                    className="accent-[#034991] h-3.5 w-3.5 shrink-0"
                  />
                  {usuario.nombreCompleto}
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {seleccionados.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {seleccionados.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-full bg-[#E6EDF4] border border-[#9AB6D3] text-[#023366] text-[11px] px-2 py-0.5"
            >
              {nombreDe(id)}
              <button
                type="button"
                aria-label={`Quitar a ${nombreDe(id)}`}
                onClick={() => alternar(id)}
                className="font-bold hover:text-[#990000] focus:outline-none"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
