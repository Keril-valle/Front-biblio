import React, { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { CategoriaDto, ModuloDto, UserSession } from '../types';
import { Toast, type ToastItem } from './Toast';

interface CategoriesViewProps {
  session: UserSession;
}

type ViewMode = 'activas' | 'archivadas';

const PAGE_SIZE = 6;

export const CategoriesView: React.FC<CategoriesViewProps> = () => {
  const [categories, setCategories] = useState<CategoriaDto[]>([]);
  const [modulos, setModulos] = useState<ModuloDto[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('activas');
  const [page, setPage] = useState(1);
  const [nameFilter, setNameFilter] = useState('');
  const [moduleFilter, setModuleFilter] = useState<number | ''>('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatModule, setNewCatModule] = useState<number | ''>('');
  const [newCatPadre, setNewCatPadre] = useState<number | ''>('');
  const [newCatTipo, setNewCatTipo] = useState<'simple' | 'doble' | 'triple'>('simple');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [toast, setToast] = useState<ToastItem | null>(null);

  const closeToast = useCallback(() => setToast(null), []);

  const load = () => {
    setLoading(true);
    Promise.all([api.categorias(), api.modulos()])
      .then(([cats, mods]) => {
        setCategories(cats);
        setModulos(mods);
      })
      .catch(() => setErrorMsg('No se pudieron cargar las categorías.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const activeCategories = categories.filter((c) => c.activo);
  const archivedCategories = categories.filter((c) => !c.activo);
  const shown = viewMode === 'activas' ? activeCategories : archivedCategories;

  const trimmedName = nameFilter.trim().toLowerCase();
  const hasFilters = trimmedName !== '' || moduleFilter !== '';
  const filtered = shown.filter((c) => {
    const byName = trimmedName === '' || c.nombre.toLowerCase().includes(trimmedName);
    const byModule = moduleFilter === '' || c.moduloId === moduleFilter;
    return byName && byModule;
  });

  // Ordena por módulo y agrupa cada categoría raíz con sus subcategorías.
  const ordenadas = [...filtered].sort((a, b) => {
    if (a.moduloId !== b.moduloId) return a.moduloId - b.moduloId;
    const raizA = a.categoriaPadreId ?? a.id;
    const raizB = b.categoriaPadreId ?? b.id;
    if (raizA !== raizB) return raizA - raizB;
    const esHijaA = a.categoriaPadreId == null ? 0 : 1;
    const esHijaB = b.categoriaPadreId == null ? 0 : 1;
    if (esHijaA !== esHijaB) return esHijaA - esHijaB;
    return a.nombre.localeCompare(b.nombre);
  });

  const totalPages = Math.max(1, Math.ceil(ordenadas.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const paged = ordenadas.slice(start, start + PAGE_SIZE);
  const end = Math.min(start + PAGE_SIZE, ordenadas.length);

  // Si la lista se achica (ej. se desactiva la última fila de la página),
  // volver a una página válida.
  useEffect(() => {
    setPage((p) => Math.min(p, Math.max(1, Math.ceil(ordenadas.length / PAGE_SIZE))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordenadas.length, viewMode]);

  const handleViewChange = (mode: ViewMode) => {
    setViewMode(mode);
    setPage(1);
  };

  const handleNameChange = (value: string) => {
    setNameFilter(value);
    setPage(1);
  };

  const handleModuleChange = (value: number | '') => {
    setModuleFilter(value);
    setPage(1);
  };

  const handleClearFilters = () => {
    setNameFilter('');
    setModuleFilter('');
    setPage(1);
  };

  const moduloName = (cat: CategoriaDto) =>
    cat.modulo?.nombre ?? `Módulo ${cat.moduloId}`;

  const etiquetaMetrica = (tipo: CategoriaDto['tipoMetrica']) =>
    tipo === 'triple'
      ? 'Cantidad + Personas + Tiempo'
      : tipo === 'doble'
        ? 'Cantidad + Personas'
        : 'Cantidad';

  // Categorías raíz de un módulo (candidatas a categoría padre).
  const raicesDeModulo = (moduloId: number) =>
    categories.filter(
      (c) => c.activo && c.moduloId === moduloId && c.categoriaPadreId == null,
    );

  const handleMoveParent = async (cat: CategoriaDto, nuevoPadre: number | null) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.actualizarCategoria(cat.id, { categoriaPadreId: nuevoPadre });
      setToast({
        id: Date.now(),
        message: nuevoPadre
          ? `«${cat.nombre}» ahora es subcategoría.`
          : `«${cat.nombre}» ahora es una categoría raíz.`,
        tone: 'info',
      });
      load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar.';
      setErrorMsg(message || 'No se pudo mover la categoría.');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newCatName.trim() || newCatModule === '') {
      setErrorMsg('Complete el nombre y seleccione un módulo.');
      return;
    }

    try {
      await api.crearCategoria({
        moduloId: Number(newCatModule),
        nombre: newCatName.trim(),
        tipoMetrica: newCatTipo,
        categoriaPadreId:
          newCatPadre === '' ? undefined : Number(newCatPadre),
      });
      setSuccessMsg('✓ Categoría creada correctamente.');
      setNewCatName('');
      setNewCatPadre('');
      load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear.';
      setErrorMsg(message || 'No se pudo crear la categoría.');
    }
  };

  const handleToggleStatus = async (cat: CategoriaDto) => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await api.actualizarCategoria(cat.id, { activo: !cat.activo });
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, activo: !cat.activo } : c)),
      );
      setToast({
        id: Date.now(),
        message: cat.activo
          ? `«${cat.nombre}» se archivó.`
          : `«${cat.nombre}» se reactivó.`,
        tone: cat.activo ? 'info' : 'success',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar.';
      setErrorMsg(message || 'No se pudo cambiar el estado.');
    }
  };

  const segButton = (mode: ViewMode, label: string, count: number) => (
    <button
      type="button"
      onClick={() => handleViewChange(mode)}
      aria-pressed={viewMode === mode}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-[#034991] focus-visible:ring-offset-1 ${
        viewMode === mode
          ? 'bg-[#034991] text-white shadow-sm'
          : 'text-[#6B6A64] hover:bg-[#F7F6F4] hover:text-[#034991]'
      }`}
    >
      {mode === 'archivadas' && (
        <svg
          aria-hidden
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
          />
        </svg>
      )}
      {label}
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
          viewMode === mode ? 'bg-white/20 text-white' : 'bg-[#F7F6F4] text-[#6B6A64]'
        }`}
      >
        {count}
      </span>
    </button>
  );

  return (
    <div className="w-full space-y-6">
      <Toast toast={toast} onClose={closeToast} />
      <div className="pb-4 border-b border-[#E3E1DA]">
        <h1 className="text-2xl font-medium text-[#262624] tracking-tight">
          Catálogo de Categorías y Servicios
        </h1>
        <p className="text-sm text-[#6B6A64] mt-1">
          Administrá las categorías de servicios disponibles para el registro diario en ambas bibliotecas.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-[#FAE8E8] border border-[#F0B9BA] text-[#901012] text-xs rounded-lg">{errorMsg}</div>
      )}
      {successMsg && (
        <div className="p-3 bg-[#E6EDF4] border border-[#9AB6D3] text-[#023366] text-xs rounded-lg">{successMsg}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tabla de categorías */}
        <div className="lg:col-span-2 space-y-3">
          <div className="rounded-xl border border-[#E3E1DA] bg-white p-1.5 shadow-xs">
            <div className="flex flex-wrap items-center gap-1.5">
              <div className="inline-flex items-center gap-1">
                {segButton('activas', 'Activas', activeCategories.length)}
                {segButton('archivadas', 'Archivadas', archivedCategories.length)}
              </div>
              <div className="ml-auto flex flex-wrap items-center gap-1.5">
                <div className="relative">
                  <svg
                    aria-hidden
                    className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#A7A7A9]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 21l-4.35-4.35M17 10.5a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z"
                    />
                  </svg>
                  <input
                    type="text"
                    value={nameFilter}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Buscar por nombre..."
                    aria-label="Filtrar por nombre"
                    className="w-44 rounded-lg border border-[#E3E1DA] bg-white py-2 pl-8 pr-2.5 text-xs text-[#262624] placeholder:text-[#A7A7A9] outline-none focus:border-[#034991] focus:ring-1 focus:ring-[#034991]"
                  />
                </div>
                <select
                  value={moduleFilter}
                  onChange={(e) =>
                    handleModuleChange(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  aria-label="Filtrar por módulo"
                  className="rounded-lg border border-[#E3E1DA] bg-white py-2 pl-2.5 pr-2 text-xs text-[#262624] outline-none focus:border-[#034991] focus:ring-1 focus:ring-[#034991]"
                >
                  <option value="">Todos los módulos</option>
                  {modulos.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.nombre}
                    </option>
                  ))}
                </select>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={handleClearFilters}
                    className="rounded-lg px-2.5 py-2 text-xs font-semibold text-[#990000] transition-colors hover:bg-[#990000]/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#990000]"
                  >
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <p className="text-xs text-[#6B6A64]">Cargando categorías...</p>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-[#E3E1DA] bg-white shadow-xs">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  {viewMode === 'activas'
                    ? 'Categorías activas en el sistema'
                    : 'Categorías archivadas o desactivadas'}
                </caption>
                <thead>
                  <tr className="border-b border-[#E3E1DA] text-[11px] uppercase tracking-wider text-[#034991]">
                    <th scope="col" className="px-4 py-3 font-semibold">Módulo</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Categoría</th>
                    <th scope="col" className="hidden px-4 py-3 font-semibold md:table-cell">Categoría padre</th>
                    <th scope="col" className="hidden px-4 py-3 font-semibold sm:table-cell">Tipo de métrica</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Estado</th>
                    <th scope="col" className="px-4 py-3 text-right font-semibold">
                      <span className="sr-only">Acción</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E3E1DA]">
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-xs text-[#6B6A64]">
                        {hasFilters
                          ? 'Sin resultados para el filtro aplicado.'
                          : viewMode === 'activas'
                            ? 'No hay categorías activas.'
                            : 'No hay categorías archivadas.'}
                      </td>
                    </tr>
                  ) : (
                    paged.map((cat) => (
                      <tr key={cat.id} className="transition-colors hover:bg-[#F7F6F4]">
                        <td className="px-4 py-3">
                          <span className="inline-block rounded bg-[#034991]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#034991]">
                            {moduloName(cat)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-medium text-[#262624]">
                          {cat.categoriaPadreId != null && (
                            <span className="mr-1 text-[#A7A7A9]">↳</span>
                          )}
                          <span className={cat.categoriaPadreId != null ? 'pl-2' : ''}>
                            {cat.nombre}
                          </span>
                        </td>
                        <td className="hidden px-4 py-3 text-xs text-[#6B6A64] md:table-cell">
                          {viewMode === 'activas' ? (
                            <select
                              value={cat.categoriaPadreId ?? ''}
                              onChange={(e) =>
                                handleMoveParent(
                                  cat,
                                  e.target.value === '' ? null : Number(e.target.value),
                                )
                              }
                              aria-label={`Categoría padre de ${cat.nombre}`}
                              className="w-full max-w-[14rem] rounded-lg border border-[#E3E1DA] bg-white py-1.5 px-2 text-xs text-[#262624] outline-none focus:border-[#034991]"
                            >
                              <option value="">(categoría raíz)</option>
                              {raicesDeModulo(cat.moduloId)
                                .filter((r) => r.id !== cat.id)
                                .map((r) => (
                                  <option key={r.id} value={r.id}>
                                    ↳ {r.nombre}
                                  </option>
                                ))}
                            </select>
                          ) : cat.categoriaPadreId != null ? (
                            categories.find((c) => c.id === cat.categoriaPadreId)?.nombre ?? '—'
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="hidden px-4 py-3 text-xs text-[#6B6A64] sm:table-cell">
                          {etiquetaMetrica(cat.tipoMetrica)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex items-center rounded-full border px-3 py-0.5 text-xs font-medium ${
                              cat.activo
                                ? 'border-[#034991]/40 bg-[#034991]/5 text-[#034991]'
                                : 'border-[#E3E1DA] bg-[#F7F6F4] text-[#6B6A64]'
                            }`}
                          >
                            {cat.activo ? 'Activa' : 'Archivada'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(cat)}
                              title={cat.activo ? 'Desactivar' : 'Reactivar'}
                              aria-label={cat.activo ? 'Desactivar' : 'Reactivar'}
                              className="rounded-lg p-1.5 text-[#A7A7A9] transition-colors hover:bg-[#F7F6F4] hover:text-[#034991] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#034991]"
                            >
                              {cat.activo ? (
                                <svg
                                  aria-hidden
                                  className="h-4.5 w-4.5"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
                                  />
                                </svg>
                              ) : (
                                <svg
                                  aria-hidden
                                  className="h-4.5 w-4.5"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3"
                                  />
                                </svg>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#E3E1DA] bg-white px-4 py-2.5 shadow-xs">
              <p className="text-xs text-[#6B6A64]">
                Mostrando {start + 1}–{end} de {filtered.length}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                  aria-label="Página anterior"
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E3E1DA] px-2.5 py-1.5 text-xs font-semibold text-[#034991] transition-colors hover:bg-[#F7F6F4] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-[#034991]"
                >
                  <svg
                    aria-hidden
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                  </svg>
                  Anterior
                </button>
                <span className="px-1 text-xs font-medium text-[#6B6A64]">
                  Página {safePage} de {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                  aria-label="Página siguiente"
                  className="inline-flex items-center gap-1 rounded-lg border border-[#E3E1DA] px-2.5 py-1.5 text-xs font-semibold text-[#034991] transition-colors hover:bg-[#F7F6F4] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-[#034991]"
                >
                  Siguiente
                  <svg
                    aria-hidden
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Agregar Nueva Categoría */}
        <div className="bg-white border border-[#E3E1DA] rounded-2xl p-6 shadow-xs h-fit space-y-4">
          <h3 className="text-base font-medium text-[#262624] font-goudy pb-2 border-b border-[#E3E1DA]">
            + Agregar Nueva Categoría
          </h3>

          <form onSubmit={handleAddCategory} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1">
                Nombre de la Categoría
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Búsqueda Interbibliotecaria"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3E1DA] outline-none focus:border-[#990000]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1">
                Módulo
              </label>
              <select
                value={newCatModule}
                onChange={(e) => {
                  setNewCatModule(
                    e.target.value === '' ? '' : Number(e.target.value),
                  );
                  setNewCatPadre('');
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3E1DA] outline-none focus:border-[#990000] bg-white"
              >
                <option value="">Seleccionar módulo...</option>
                {modulos.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.nombre}
                  </option>
                ))}
              </select>
            </div>

            {newCatModule !== '' && (
              <div>
                <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1">
                  Categoría padre (opcional)
                </label>
                <select
                  value={newCatPadre}
                  onChange={(e) =>
                    setNewCatPadre(
                      e.target.value === '' ? '' : Number(e.target.value),
                    )
                  }
                  className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3E1DA] outline-none focus:border-[#990000] bg-white"
                >
                  <option value="">(categoría raíz)</option>
                  {raicesDeModulo(Number(newCatModule)).map((r) => (
                    <option key={r.id} value={r.id}>
                      ↳ {r.nombre}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1">
                Tipo de Métrica
              </label>
              <select
                value={newCatTipo}
                onChange={(e) =>
                  setNewCatTipo(e.target.value as 'simple' | 'doble' | 'triple')
                }
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3E1DA] outline-none focus:border-[#990000] bg-white"
              >
                <option value="simple">Cantidad (simple)</option>
                <option value="doble">Cantidad + Personas (doble)</option>
                <option value="triple">Cantidad + Personas + Tiempo (capacitación)</option>
              </select>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#990000] hover:bg-[#CD1719] text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Guardar Categoría
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};