import React from 'react';
import { SubsistemaLogo } from './SubsistemaLogo';
import { CampusId } from '../types';

interface HeroSectionProps {
  onDirectAccess?: (campusId: CampusId) => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({ onDirectAccess }) => {
  return (
    <header
      id="hero-institutional"
      className="relative w-full overflow-hidden bg-white text-[#262624] py-8 sm:py-12 border-b border-[#E3E1DA]"
    >
      <div className="absolute top-0 left-0 w-full h-1.5 bg-[#990000]" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 relative z-10 flex flex-col items-center text-center">
        <div className="mb-4 sm:mb-6">
          <SubsistemaLogo size="md" />
        </div>

        <div className="mb-2">
          <span className="text-xs sm:text-sm font-semibold tracking-[0.2em] uppercase text-[#585757]">
            UNIVERSIDAD NACIONAL — SEDE REGIONAL CHOROTEGA
          </span>
        </div>

        <h1 className="font-goudy text-2xl sm:text-3xl md:text-4xl font-semibold leading-tight tracking-tight mb-3 max-w-2xl">
          Sistema de estadísticas y atención al usuario
        </h1>

        <p className="text-sm sm:text-base leading-relaxed max-w-xl text-[#6B6A64]">
          Centraliza el registro de atenciones cotidianas y genera reportes automáticos para las bibliotecas del Campus Regional Chorotega.
        </p>

        {onDirectAccess && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => onDirectAccess('nicoya')}
              className="px-4 py-2.5 bg-[#990000] hover:bg-[#CD1719] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
              Explorar Sistema — Campus Nicoya
            </button>
            <button
              onClick={() => onDirectAccess('liberia')}
              className="px-4 py-2.5 bg-[#034991] hover:bg-[#023266] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
              Explorar Sistema — Campus Liberia
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
