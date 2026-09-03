import React, { useState } from 'react';
import { CAMPUSES } from '../data/campuses';
import { api } from '../api/client';
import { CampusId, UserSession } from '../types';
import { LibraryLogo } from './LibraryLogos';

interface LoginModalViewProps {
  campusId: CampusId;
  onBackToSelector: () => void;
  onLoginSuccess: (session: UserSession) => void;
}

export const LoginModalView: React.FC<LoginModalViewProps> = ({
  campusId,
  onBackToSelector,
  onLoginSuccess,
}) => {
  const campus = CAMPUSES[campusId];
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLoginWithRole = async (
    selectedRole: 'bibliotecologa' | 'jefatura',
    userEmail?: string,
    userName?: string,
  ) => {
    setIsLoading(true);
    setErrorMsg('');
    const finalEmail =
      userEmail ||
      (email.trim()
        ? email.includes('@')
          ? email.trim()
          : `${email.trim()}@una.cr`
        : `usuario.${campusId}@una.cr`);
    const finalName =
      userName ||
      (selectedRole === 'jefatura'
        ? 'Nuria Zamora Chavarria (Jefatura)'
        : 'Licda. María Elena Solís (Bibliotecóloga)');
    const demoPassword = selectedRole === 'jefatura' ? 'Jefa1234!' : 'Biblio1234!';

    try {
      const res = await api.login(finalEmail, password || demoPassword);
      onLoginSuccess({
        accessToken: res.accessToken,
        email: res.usuario.email,
        role: res.usuario.rol,
        campus: res.usuario.sedeId === 1 ? 'nicoya' : 'liberia',
        campusId: res.usuario.sedeId,
        name: res.usuario.nombreCompleto || finalName,
        userId: res.usuario.id,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error al iniciar sesión.';
      setErrorMsg(message || 'Credenciales inválidas.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Por favor ingrese su correo institucional y contraseña.');
      return;
    }

    await handleLoginWithRole('jefatura', email.trim(), undefined);
  };

  return (
    <div className="w-full flex-1 flex flex-col justify-center items-center py-10 px-4 bg-[#F7F6F4] text-[#262624]">
      {/* Top Navigation Bar back to Campus selector */}
      <div className="w-full max-w-lg mb-4 flex justify-between items-center">
        <button
          onClick={onBackToSelector}
          className="inline-flex items-center text-xs font-semibold uppercase tracking-wider text-[#585757] hover:text-[#990000] transition-colors focus:outline-none focus:ring-2 focus:ring-[#990000] focus:ring-offset-2 rounded-lg px-2.5 py-1.5 bg-white border border-[#E3E1DA]"
        >
          <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Regresar a Selección de Campus
        </button>

        <span className="text-xs text-[#6B6A64] bg-white border border-[#E3E1DA] px-3 py-1 rounded-full font-mono">
          Campus: <strong className="text-[#990000]">{campus.name}</strong>
        </span>
      </div>

      {/* Institutional Login Card */}
      <div className="w-full max-w-lg bg-white border border-[#E3E1DA] rounded-2xl shadow-sm overflow-hidden">
        {/* Card Red Top Border Accent */}
        <div className="w-full h-1.5 bg-[#990000]" />

        {/* Header displaying official library logo */}
        <div className="p-6 sm:p-8 text-center border-b border-[#E3E1DA] bg-gradient-to-b from-[#F7F6F4] to-white flex flex-col items-center">
          <div className="mb-4">
            <LibraryLogo campusId={campusId} />
          </div>
          <span className="text-xs font-bold uppercase tracking-widest text-[#990000] mb-1">
            {campus.fullName}
          </span>
          <h2 className="text-xl sm:text-2xl font-medium text-[#262624] font-goudy">
            Inicio de Sesión
          </h2>
          <p className="text-xs text-[#6B6A64] mt-1 max-w-xs">
            Acceso al Sistema de Estadísticas del Subsistema de Bibliotecas — {campus.libraryName}.
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-5">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-lg flex items-center gap-2">
              <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Email input */}
          <div>
            <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-2">
              Correo Institucional UNA <span className="text-[#990000]">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder={`usuario.${campusId}@una.cr`}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-[#E3E1DA] focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none text-sm text-[#262624] placeholder:text-[#A7A7A9] transition-colors"
              />
              <svg className="w-5 h-5 text-[#A7A7A9] absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
              </svg>
            </div>
            <p className="text-[11px] text-[#6B6A64] mt-1">Debe utilizar su cuenta @una.cr corporativa.</p>
          </div>

          {/* Password input */}
          <div>
            <label className="block text-xs font-semibold text-[#585757] uppercase tracking-wider mb-2">
              Contraseña <span className="text-[#990000]">*</span>
            </label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-lg border border-[#E3E1DA] focus:border-[#990000] focus:ring-1 focus:ring-[#990000] outline-none text-sm text-[#262624] transition-colors"
              />
              <svg className="w-5 h-5 text-[#A7A7A9] absolute left-3 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          {/* Submit button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-[#990000] hover:bg-[#CD1719] active:bg-[#7D0000] text-white font-medium text-sm rounded-lg shadow-xs transition-colors duration-200 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-[#990000] focus:ring-offset-2 disabled:opacity-70 mt-2"
          >
            {isLoading ? (
              <span className="inline-flex items-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verificando Credenciales...
              </span>
            ) : (
              `Ingresar a ${campus.libraryName}`
            )}
          </button>

          {/* Quick Demo Access Divider */}
          <div className="pt-3 border-t border-[#E3E1DA]">
            <span className="block text-[11px] font-semibold text-[#585757] uppercase tracking-wider text-center mb-2 flex items-center justify-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-[#990000]" fill="currentColor" viewBox="0 0 20 20">
                <path d="M11.983 1.907a.75.75 0 00-1.292-.657l-8.5 9.5A.75.75 0 002.75 12h5.572l-1.305 6.093a.75.75 0 001.292.657l8.5-9.5A.75.75 0 0017.25 8h-5.572l1.305-6.093z" />
              </svg>
              Acceso Inmediato en 1-Clic
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  handleLoginWithRole(
                    'bibliotecologa',
                    `bibliotecologa.${campusId}@una.cr`,
                    'Licda. María Elena Solís',
                  )
                }
                className="py-2 px-3 bg-[#F7F6F4] hover:bg-[#990000]/10 hover:border-[#990000] border border-[#E3E1DA] rounded-lg text-xs font-medium text-[#262624] transition-colors text-left flex items-center justify-between"
              >
                <span>Acceso Bibliotecóloga</span>
                <span className="text-[10px] text-[#990000] font-bold">Entrar →</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  handleLoginWithRole(
                    'jefatura',
                    'jefa@una.cr',
                    'Nuria Zamora Chavarria',
                  )
                }
                className="py-2 px-3 bg-[#F7F6F4] hover:bg-[#990000]/10 hover:border-[#990000] border border-[#E3E1DA] rounded-lg text-xs font-medium text-[#262624] transition-colors text-left flex items-center justify-between"
              >
                <span>Acceso Jefa de Biblioteca</span>
                <span className="text-[10px] text-[#990000] font-bold">Entrar →</span>
              </button>
            </div>
          </div>
        </form>

        {/* Footer info inside modal */}
        <div className="bg-[#F7F6F4] p-4 text-center border-t border-[#E3E1DA] text-xs text-[#6B6A64]">
          <p>Subsistema de Bibliotecas — Universidad Nacional de Costa Rica</p>
        </div>
      </div>
    </div>
  );
};
