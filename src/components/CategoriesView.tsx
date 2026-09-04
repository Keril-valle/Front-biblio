import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { CategoriaDto, ModuloDto, UserSession } from '../types';

interface CategoriesViewProps {
  session: UserSession;
}

export const CategoriesView: React.FC<CategoriesViewProps> = () => {
  const [categories, setCategories] = useState<CategoriaDto[]>([]);
  const [modulos, setModulos] = useState<ModuloDto[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [newCatModule, setNewCatModule] = useState<number | ''>('');
  const [newCatTipo, setNewCatTipo] = useState<'simple' | 'doble'>('simple');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

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
      });
      setSuccessMsg('✓ Categoría creada correctamente.');
      setNewCatName('');
      load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear.';
      setErrorMsg(message || 'No se pudo crear la categoría.');
    }
  };

  const handleToggleStatus = async (cat: CategoriaDto) => {
    try {
      await api.actualizarCategoria(cat.id, { activo: !cat.activo });
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, activo: !cat.activo } : c)),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar.';
      setErrorMsg(message || 'No se pudo cambiar el estado.');
    }
  };

  return (
    <div className="w-full space-y-6">
      <div className="pb-4 border-b border-[#E3E1DA]">
        <h1 className="text-2xl font-medium text-[#262624] tracking-tight">
          Catálogo de Categorías y Servicios
        </h1>
        <p className="text-sm text-[#6B6A64] mt-1">
          Administrá las categorías de servicios disponibles para el registro diario en ambas bibliotecas.
        </p>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg">{errorMsg}</div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg">{successMsg}</div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category List */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#585757]">
            Categorías en el Sistema ({categories.length})
          </h2>

          {loading ? (
            <p className="text-xs text-[#6B6A64]">Cargando categorías...</p>
          ) : (
            <div className="space-y-3">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="p-4 rounded-xl border border-[#E3E1DA] bg-white shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#990000] transition-colors"
                >
                  <div>
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-[#990000]/10 text-[#990000] px-2 py-0.5 rounded">
                        {cat.modulo?.nombre ?? `Módulo ${cat.moduloId}`}
                      </span>
                      <span className="text-[10px] text-[#585757] font-medium bg-[#F7F6F4] border border-[#E3E1DA] px-2 py-0.5 rounded">
                        {cat.tipoMetrica === 'doble' ? 'Cantidad + Personas' : 'Cantidad'}
                      </span>
                    </div>
                    <h3 className="text-sm font-semibold text-[#262624]">{cat.nombre}</h3>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                        cat.activo ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {cat.activo ? 'Activa' : 'Inactiva'}
                    </span>
                    <button
                      onClick={() => handleToggleStatus(cat)}
                      className="text-xs font-medium px-2.5 py-1 rounded border border-[#E3E1DA] hover:border-[#990000] text-[#585757] hover:text-[#990000]"
                    >
                      {cat.activo ? 'Desactivar' : 'Activar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Category Form */}
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
                onChange={(e) =>
                  setNewCatModule(
                    e.target.value === '' ? '' : Number(e.target.value),
                  )
                }
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

            <div>
              <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1">
                Tipo de Métrica
              </label>
              <select
                value={newCatTipo}
                onChange={(e) => setNewCatTipo(e.target.value as 'simple' | 'doble')}
                className="w-full px-3 py-2 text-sm rounded-lg border border-[#E3E1DA] outline-none focus:border-[#990000] bg-white"
              >
                <option value="simple">Cantidad (simple)</option>
                <option value="doble">Cantidad + Personas (doble)</option>
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
