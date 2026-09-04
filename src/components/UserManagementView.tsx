import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { CampusId, UserAccount, UsuarioDto, UserSession } from '../types';

interface UserManagementViewProps {
  session: UserSession;
}

function mapUsuario(u: UsuarioDto): UserAccount {
  return {
    id: u.id,
    fullName: u.nombreCompleto,
    email: u.email,
    campus: u.sedeId === 1 ? 'nicoya' : 'liberia',
    role: u.rol === 'jefa' ? 'jefatura' : 'bibliotecologa',
    status: u.activo ? 'activo' : 'inactivo',
    accessMethod: u.googleId ? 'google' : 'password',
    createdAt: '',
  };
}

type FilterChip = 'todas' | 'nicoya' | 'liberia' | 'bibliotecologa' | 'jefatura';

export const UserManagementView: React.FC<UserManagementViewProps> = ({ session }) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterChip>('todas');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // New account form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedCampus, setSelectedCampus] = useState<CampusId>('nicoya');
  const [role, setRole] = useState<'bibliotecologa' | 'jefatura'>('bibliotecologa');
  const [accessMethod, setAccessMethod] = useState<'password' | 'google'>('password');
  const [tempPassword, setTempPassword] = useState('');
  const [formError, setFormError] = useState('');

  const load = () => {
    setLoading(true);
    api
      .usuarios()
      .then((usrs) => setUsers(usrs.map(mapUsuario)))
      .catch(() => setErrorMsg('No se pudieron cargar los usuarios.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter logic
  const filteredUsers = users.filter((usr) => {
    if (activeFilter === 'nicoya') return usr.campus === 'nicoya';
    if (activeFilter === 'liberia') return usr.campus === 'liberia';
    if (activeFilter === 'bibliotecologa') return usr.role === 'bibliotecologa';
    if (activeFilter === 'jefatura') return usr.role === 'jefatura';
    return true;
  });

  const handleOpenModal = () => {
    setFullName('');
    setEmail('');
    setSelectedCampus(session.campus || 'nicoya');
    setRole('bibliotecologa');
    setAccessMethod('password');
    setTempPassword('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim() || !email.trim()) {
      setFormError('Por favor complete todos los campos obligatorios.');
      return;
    }

    if (accessMethod === 'password' && !tempPassword.trim()) {
      setFormError('Por favor ingrese la contraseña temporal.');
      return;
    }

    try {
      await api.crearUsuario({
        nombreCompleto: fullName.trim(),
        email: email.includes('@') ? email.trim() : `${email.trim()}@una.cr`,
        sedeId: selectedCampus === 'nicoya' ? 1 : 2,
        rol: role === 'jefatura' ? 'jefa' : 'bibliotecologa',
        password: accessMethod === 'password' ? tempPassword : undefined,
      });
      setIsModalOpen(false);
      load();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al crear usuario.';
      setFormError(message || 'No se pudo crear el usuario.');
    }
  };

  const handleToggleStatus = async (usr: UserAccount) => {
    try {
      await api.desactivarUsuario(usr.id);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === usr.id
            ? { ...u, status: u.status === 'activo' ? 'inactivo' : 'activo' }
            : u,
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al actualizar.';
      setErrorMsg(message || 'No se pudo actualizar el usuario.');
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E3E1DA]">
        <div>
          <h1 className="text-2xl font-medium text-[#262624] tracking-tight">
            Usuarios
          </h1>
          <p className="text-sm text-[#6B6A64] mt-1">
            Gestioná las cuentas de bibliotecólogas y jefas de ambos campus.
          </p>
        </div>

        {/* Primary Action Button - Solid Official Red */}
        <button
          onClick={handleOpenModal}
          className="inline-flex items-center justify-center px-4 py-2.5 bg-[#990000] hover:bg-[#CD1719] active:bg-[#7D0000] text-white text-sm font-medium rounded-lg shadow-xs transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-[#990000] focus:ring-offset-2 shrink-0"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          + Crear cuenta
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg">{errorMsg}</div>
      )}

      {/* 2. Quick Filters (Chips/Pills Horizontal Row) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-xs font-semibold uppercase tracking-wider text-[#585757] mr-1 shrink-0">
          Filtrar:
        </span>
        {[
          { key: 'todas', label: 'Ambos campus' },
          { key: 'nicoya', label: 'Campus Nicoya' },
          { key: 'liberia', label: 'Campus Liberia' },
          { key: 'bibliotecologa', label: 'Bibliotecólogas' },
          { key: 'jefatura', label: 'Jefas de Biblioteca' },
        ].map((filter) => {
          const isActive = activeFilter === filter.key;
          return (
            <button
              key={filter.key}
              onClick={() => setActiveFilter(filter.key as FilterChip)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 shrink-0 border focus:outline-none focus:ring-2 focus:ring-[#990000] ${
                isActive
                  ? 'bg-[#990000]/10 border-[#990000] text-[#990000] font-semibold'
                  : 'bg-white border-[#E3E1DA] text-[#585757] hover:border-[#990000] hover:text-[#990000]'
              }`}
            >
              {filter.label}
            </button>
          );
        })}
      </div>

      {/* 3. Users Table */}
      <div className="bg-white border border-[#E3E1DA] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F7F6F4] border-b border-[#E3E1DA] text-[11px] font-bold text-[#585757] uppercase tracking-wider">
                <th className="py-3 px-4">Nombre Completo</th>
                <th className="py-3 px-4">Correo Institucional</th>
                <th className="py-3 px-4">Campus</th>
                <th className="py-3 px-4">Rol</th>
                <th className="py-3 px-4">Estado</th>
                <th className="py-3 px-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E3E1DA] text-sm text-[#262624]">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#6B6A64]">
                    <p className="text-sm font-medium text-[#262624]">Cargando usuarios...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-[#6B6A64]">
                    <p className="text-sm font-medium text-[#262624]">No hay usuarios que coincidan con este filtro</p>
                    <p className="text-xs text-[#6B6A64] mt-0.5">Probá cambiando el campus o el rol seleccionado arriba.</p>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((usr) => (
                  <tr key={usr.id} className="hover:bg-[#F7F6F4]/60 transition-colors duration-150">
                    <td className="py-3.5 px-4 font-medium text-[#262624]">
                      {usr.fullName}
                    </td>
                    <td className="py-3.5 px-4 text-xs font-mono text-[#585757]">
                      {usr.email}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <span className="inline-flex items-center font-medium text-[#262624]">
                        {usr.campus === 'nicoya' ? 'Nicoya (Nayuribe)' : 'Liberia (Rose Marie)'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {usr.role === 'jefatura' ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#990000]/10 text-[#990000] border border-[#990000]/20">
                          Jefa de Biblioteca
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#585757]/10 text-[#585757] border border-[#E3E1DA]">
                          Bibliotecóloga
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        <span className={`w-2 h-2 rounded-full ${usr.status === 'activo' ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {usr.status === 'activo' ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => handleToggleStatus(usr)}
                        className={`text-xs font-medium px-2.5 py-1 rounded border transition-colors ${
                          usr.status === 'activo'
                            ? 'border-gray-200 text-[#585757] hover:border-red-300 hover:text-red-700 bg-white'
                            : 'border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-white'
                        }`}
                      >
                        {usr.status === 'activo' ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Modal "Crear cuenta" */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white border border-[#E3E1DA] rounded-2xl shadow-xl overflow-hidden">
            {/* Red Accent Top Border */}
            <div className="w-full h-1.5 bg-[#990000]" />

            {/* Modal Header */}
            <div className="p-6 border-b border-[#E3E1DA] flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-[#262624] font-goudy">
                  Crear cuenta nueva
                </h3>
                <p className="text-xs text-[#6B6A64] mt-0.5">
                  Asigná el rol y el campus correspondiente para el usuario de la UNA.
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#6B6A64] hover:text-[#262624] p-1 rounded-lg hover:bg-[#F7F6F4] transition-colors"
                aria-label="Cerrar modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg flex items-center gap-2">
                  <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{formError}</span>
                </div>
              )}

              {/* 1. Nombre Completo */}
              <div>
                <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5">
                  1. Nombre Completo <span className="text-[#990000]">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Licda. Sofía Monge Castro"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E1DA] focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none text-sm text-[#262624] placeholder:text-[#A7A7A9]"
                />
              </div>

              {/* 2. Correo Electrónico */}
              <div>
                <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5">
                  2. Correo Electrónico Institucional (@una.cr) <span className="text-[#990000]">*</span>
                </label>
                <input
                  type="email"
                  required
                  placeholder="sofia.monge@una.cr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E1DA] focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none text-sm text-[#262624] placeholder:text-[#A7A7A9]"
                />
              </div>

              {/* 3. Campus Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5">
                  3. Campus Institucional <span className="text-[#990000]">*</span>
                </label>
                <select
                  value={selectedCampus}
                  onChange={(e) => setSelectedCampus(e.target.value as CampusId)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E1DA] focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none text-sm text-[#262624] bg-white cursor-pointer"
                >
                  <option value="nicoya">Campus Nicoya — Biblioteca Nayuribe</option>
                  <option value="liberia">Campus Liberia — Biblioteca Rose Marie Ruiz Bravo</option>
                </select>
              </div>

              {/* 4. Rol Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5">
                  4. Rol en el Sistema <span className="text-[#990000]">*</span>
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as 'bibliotecologa' | 'jefatura')}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E1DA] focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none text-sm text-[#262624] bg-white cursor-pointer"
                >
                  <option value="bibliotecologa">Bibliotecóloga (Registro y atención)</option>
                  <option value="jefatura">Jefa de Biblioteca (Administración y reportes)</option>
                </select>
              </div>

              {/* 5. Método de Acceso (Radio Buttons) */}
              <div>
                <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-2">
                  5. Método de Acceso <span className="text-[#990000]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      accessMethod === 'password'
                        ? 'border-[#990000] bg-[#990000]/5 text-[#262624]'
                        : 'border-[#E3E1DA] bg-white text-[#585757]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="accessMethod"
                      value="password"
                      checked={accessMethod === 'password'}
                      onChange={() => setAccessMethod('password')}
                      className="accent-[#990000]"
                    />
                    <span className="text-xs font-medium">Contraseña</span>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                      accessMethod === 'google'
                        ? 'border-[#990000] bg-[#990000]/5 text-[#262624]'
                        : 'border-[#E3E1DA] bg-white text-[#585757]'
                    }`}
                  >
                    <input
                      type="radio"
                      name="accessMethod"
                      value="google"
                      checked={accessMethod === 'google'}
                      onChange={() => setAccessMethod('google')}
                      className="accent-[#990000]"
                    />
                    <span className="text-xs font-medium">Cuenta de Google UNA</span>
                  </label>
                </div>
              </div>

              {/* Dynamic Temporal Password Field */}
              {accessMethod === 'password' && (
                <div className="pt-2 transition-all duration-200">
                  <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-1.5">
                    Contraseña Temporal <span className="text-[#990000]">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={tempPassword}
                    onChange={(e) => setTempPassword(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-[#E3E1DA] focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none text-sm text-[#262624]"
                  />
                  <p className="text-[11px] text-[#6B6A64] mt-1 italic">
                    La persona deberá cambiarla en su primer ingreso al sistema.
                  </p>
                </div>
              )}

              {/* Modal Action Buttons (acción primero, Cancelar después: orden de Tab) */}
              <div className="pt-4 border-t border-[#E3E1DA] flex items-center justify-end gap-3">
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#990000] hover:bg-[#CD1719] active:bg-[#7D0000] text-white text-xs font-semibold rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[#990000] focus:ring-offset-2"
                >
                  Crear cuenta
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-[#585757] hover:text-[#262624] transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
