import React, { useState } from 'react';
import { CAMPUSES } from '../data/campuses';
import { SidebarTab, UserSession } from '../types';
import { LibraryLogo } from './LibraryLogos';

interface SidebarNavProps {
  session: UserSession;
  activeTab: SidebarTab;
  onTabChange: (tab: SidebarTab) => void;
  onLogout: () => void;
  onChangeCampus: () => void;
  children: React.ReactNode;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  session,
  activeTab,
  onTabChange,
  onLogout,
  onChangeCampus,
  children,
}) => {
  const campus = CAMPUSES[session.campus];
  const isJefatura = session.role === 'jefa' || session.role === 'jefatura';
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mainNavItems: { id: SidebarTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'registro',
      label: 'Registro',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
        </svg>
      ),
    },
    {
      id: 'dashboard',
      label: 'Estadísticas',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      ),
    },
  ];

  const adminNavItems: { id: SidebarTab; label: string; icon: React.ReactNode }[] = [
    {
      id: 'usuarios',
      label: 'Usuarios',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
    },
    {
      id: 'categorias',
      label: 'Categorías',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
        </svg>
      ),
    },
    {
      id: 'ciclos',
      label: 'Ciclos',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
    },
    {
      id: 'reportes',
      label: 'Reportes',
      icon: (
        <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
    },
  ];

  // Las estadísticas son solo para jefatura: la bibliotecóloga solo registra.
  const visibleMainNavItems = mainNavItems.filter(
    (item) => item.id !== 'dashboard' || isJefatura,
  );

  const handleNavClick = (tab: SidebarTab) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
  };

  const sidebarContent = (
    <aside className="w-full lg:w-72 bg-white border-r border-[#E3E1DA] flex flex-col justify-between h-full min-h-screen">
      <div>
        {/* 1. Identity Block (Top of Sidebar) */}
        <div className="p-5 border-b border-[#E3E1DA] bg-[#990000]/5 flex flex-col items-start gap-3">
          {/* Compact Library Logo */}
          <div className="w-full flex justify-center py-1">
            <LibraryLogo campusId={session.campus} size="sm" />
          </div>

          {/* User Name & Role Info */}
          <div className="w-full pt-2 border-t border-[#E3E1DA]">
            <p className="text-xs font-semibold text-[#262624] truncate">
              {session.name}
            </p>
            <p className="text-[11px] text-[#6B6A64] truncate">
              {isJefatura ? 'Jefa de Biblioteca' : 'Bibliotecóloga'} · {campus.name}
            </p>
          </div>
        </div>

        {/* 2. Main Navigation Menu (Visible for Both Roles) */}
        <div className="p-4 space-y-1">
          <span className="block px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#585757]">
            MENÚ PRINCIPAL
          </span>
          {visibleMainNavItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#990000] ${
                  isActive
                    ? 'border-l-4 border-[#990000] bg-[#F7F6F4] text-[#990000] font-semibold pl-2.5'
                    : 'text-[#262624] hover:bg-[#F7F6F4] hover:text-[#990000]'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* 3. Administration Menu (Visible ONLY for Jefa) */}
        {isJefatura && (
          <div className="p-4 pt-2 border-t border-[#E3E1DA] space-y-1">
            <span className="block px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#585757]">
              ADMINISTRACIÓN
            </span>
            {adminNavItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#990000] ${
                    isActive
                      ? 'border-l-4 border-[#990000] bg-[#F7F6F4] text-[#990000] font-semibold pl-2.5'
                      : 'text-[#262624] hover:bg-[#F7F6F4] hover:text-[#990000]'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}
        {/* 3b. Acciones de sesión (justo debajo del menú, sin bajar al fondo) */}
        <div className="p-4 pt-2 border-t border-[#E3E1DA] space-y-2">
          <button
            onClick={onChangeCampus}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#585757] hover:bg-white hover:text-[#990000] transition-colors border border-[#E3E1DA]"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            <span>Cambiar de Campus</span>
          </button>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-[#585757] hover:text-[#262624] hover:bg-[#E3E1DA]/50 transition-colors"
          >
            <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
            </svg>
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>

      {/* 4. Bottom Sidebar Footer */}
      <div className="p-4 border-t border-[#E3E1DA] bg-[#F7F6F4]/50">
        {/* Discrete Signature Footer */}
        <p className="text-[11px] text-[#6B6A64] text-center leading-tight">
          Sistema de Estadísticas · Campus Regional Chorotega, UNA
        </p>
      </div>
    </aside>
  );

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#F7F6F4] text-[#262624]">
      {/* Mobile Top Navigation Header (<1024px) */}
      <header className="lg:hidden bg-white border-b border-[#E3E1DA] px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-[#585757] hover:text-[#990000] focus:outline-none focus:ring-2 focus:ring-[#990000] rounded-lg"
          aria-label="Abrir menú"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="text-center">
          <span className="text-xs font-bold text-[#990000] uppercase tracking-wider">
            {campus.libraryName}
          </span>
          <p className="text-[10px] text-[#6B6A64]">{campus.name}</p>
        </div>

        <div className="w-8 h-8 rounded-full bg-[#990000] text-white flex items-center justify-center font-bold text-xs">
          {session.name.charAt(0)}
        </div>
      </header>

      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-xs"
        />
      )}

      {/* Sidebar Drawer on Mobile / Fixed Sidebar on Desktop */}
      <div
        className={`fixed lg:static inset-y-0 left-0 z-50 transform transition-transform duration-200 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {sidebarContent}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full overflow-y-auto">
        {children}
      </main>
    </div>
  );
};
