import React from 'react';

const SEDE_SELECTOR_ID = 'selector-de-sede';

const scrollToSedeSelector = () => {
  const el = document.getElementById(SEDE_SELECTOR_ID);
  if (el) el.scrollIntoView({ behavior: 'smooth' });
};

export const HomeHeaderNav: React.FC = () => {
  return (
    <header className="w-full bg-white border-b border-[#E3E1DA] sticky top-0 z-40 shadow-xs">
      <div className="w-full h-1 bg-[#990000]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#990000] text-white flex items-center justify-center font-goudy font-bold text-base shadow-xs shrink-0">
            UNA
          </div>

          <div className="flex flex-col">
            <span className="text-xs font-bold text-[#990000] uppercase tracking-wider leading-none">
              SIBUNA · Campus Regional Chorotega
            </span>
            <span className="text-sm font-semibold text-[#262624] tracking-tight font-goudy mt-0.5">
              Sistema de Estadísticas de Bibliotecas
            </span>
          </div>
        </div>

        <button
          onClick={scrollToSedeSelector}
          className="px-4 py-2 bg-[#990000] hover:bg-[#CD1719] active:bg-[#7D0000] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs flex items-center gap-1.5"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
          </svg>
          <span>Iniciar Sesión</span>
        </button>
      </div>
    </header>
  );
};
