import React from 'react';

export const FooterSection: React.FC = () => {
  return (
    <footer id="footer-institucional" className="w-full py-8 px-4 border-t border-[#E3E1DA] bg-white text-center mt-auto">
      <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6B6A64]">
        {/* Institutional Text Line */}
        <p className="text-center sm:text-left leading-relaxed">
          Sistema desarrollado para el <strong className="font-semibold text-[#262624]">Subsistema de Bibliotecas</strong>, Campus Regional Chorotega — Universidad Nacional de Costa Rica.
        </p>

        {/* Small UNA Emblem Accent */}
        <div className="flex items-center gap-2 text-[#585757] shrink-0">
          <svg width="20" height="20" viewBox="0 0 100 100" fill="none" className="opacity-70">
            <path d="M50 10 C 25 10, 15 25, 15 50 C 15 85, 55 98, 50 100 C 55 98, 90 85, 90 50 C 90 25, 80 10, 50 10 Z" stroke="currentColor" strokeWidth="6" fill="none" />
            <path d="M50 25 V75" stroke="currentColor" strokeWidth="6" />
          </svg>
          <span className="font-goudy font-bold text-sm tracking-wide">UNA</span>
        </div>
      </div>
    </footer>
  );
};
