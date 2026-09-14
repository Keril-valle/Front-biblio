import React from 'react';
import { scrollToSelector } from '../utils/scrollToSelector';

export const HomeHeaderNav: React.FC = () => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#E3E1DA] bg-white/95 shadow-xs backdrop-blur supports-[backdrop-filter]:bg-white/80">
      <div aria-hidden className="flex h-1 w-full">
        <div className="h-full flex-1 bg-[#990000]" />
        <div className="h-full w-24 bg-[#034991]" />
      </div>

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#CD1719] font-goudy text-base font-bold text-white shadow-sm">
            <span className="relative z-10">UNA</span>
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-1 bg-[#034991]" />
          </div>
          <div className="flex min-w-0 flex-col leading-tight">
            <span className="truncate text-[11px] font-bold uppercase tracking-[0.16em] text-[#990000] sm:text-xs">
              Subsistema de Bibliotecas
            </span>
            <span className="truncate text-[13px] text-[#6B6A64]">
              Campus Regional Chorotega · Universidad Nacional
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={scrollToSelector}
          className="group inline-flex shrink-0 items-center gap-2 rounded-lg border border-[#990000]/30 bg-white px-3.5 py-2 text-xs font-semibold text-[#990000] transition-colors hover:border-[#990000] hover:bg-[#990000] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#990000] focus-visible:ring-offset-2"
        >
          Iniciar sesión
          <svg
            className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </header>
  );
};