import React from 'react';
import { CAMPUSES } from '../data/campuses';
import { LibraryLogo } from './LibraryLogos';
import { CampusId } from '../types';

interface CampusSelectorProps {
  onSelectCampus: (campusId: CampusId) => void;
  onDirectAccess?: (campusId: CampusId) => void;
  selectedCampus?: CampusId | null;
}

export const CampusSelector: React.FC<CampusSelectorProps> = ({
  onSelectCampus,
  onDirectAccess,
  selectedCampus = null,
}) => {
  const campusList = [CAMPUSES.nicoya, CAMPUSES.liberia];

  const handleKeyDown = (e: React.KeyboardEvent, campusId: CampusId) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelectCampus(campusId);
    }
  };

  return (
    <section
      id="selector-de-sede"
      className="w-full py-10 sm:py-14 px-4 sm:px-6 max-w-5xl mx-auto flex flex-col items-center"
      aria-labelledby="selector-heading"
    >
      {/* Heading */}
      <div className="text-center mb-8">
        <h2
          id="selector-heading"
          className="text-xl sm:text-2xl font-medium text-[#262624] font-sans tracking-tight mb-1.5"
        >
          ¿Desde qué biblioteca ingresás?
        </h2>
        <p className="text-sm text-[#6B6A64]">
          Hacé clic sobre tu biblioteca para acceder al sistema e iniciar sesión.
        </p>
      </div>

      {/* Grid of 2 Equal-Weighted Cards */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 items-stretch">
        {campusList.map((campus) => {
          const isSelected = selectedCampus === campus.id;

          return (
            <div
              key={campus.id}
              id={`card-sede-${campus.id}`}
              role="button"
              tabIndex={0}
              onClick={() => onSelectCampus(campus.id as CampusId)}
              onKeyDown={(e) => handleKeyDown(e, campus.id as CampusId)}
              aria-label={`Ingresar a ${campus.libraryName}, ${campus.fullName}`}
              className={`group relative flex flex-col items-center justify-between p-6 sm:p-8 rounded-2xl bg-white border cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[#990000] focus:ring-offset-2 ${
                isSelected
                  ? 'border-[#990000] shadow-md ring-1 ring-[#990000]'
                  : 'border-[#E3E1DA] hover:border-[#990000] hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              {/* Subtle Top Red Accent Line on Hover */}
              <div
                className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl transition-colors duration-200 ${
                  isSelected ? 'bg-[#990000]' : 'bg-transparent group-hover:bg-[#990000]'
                }`}
              />

              {/* Official Campus Library Logo */}
              <div className="w-full flex items-center justify-center min-h-[140px] my-2">
                <LibraryLogo campusId={campus.id as CampusId} />
              </div>

              {/* Text Information Block */}
              <div className="text-center mt-2 flex flex-col items-center">
                <span className="text-xs font-bold uppercase tracking-wider text-[#990000] mb-1">
                  {campus.badge}
                </span>
                <h3 className="text-lg sm:text-xl font-medium text-[#262624] font-goudy group-hover:text-[#990000] transition-colors duration-200">
                  {campus.libraryName}
                </h3>
                <span className="text-xs text-[#6B6A64] mt-0.5">
                  {campus.location}
                </span>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 w-full space-y-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDirectAccess) {
                      onDirectAccess(campus.id as CampusId);
                    } else {
                      onSelectCampus(campus.id as CampusId);
                    }
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#990000] hover:bg-[#CD1719] text-white font-semibold text-xs uppercase tracking-wider transition-all duration-200 shadow-xs flex items-center justify-center gap-2"
                >
                  <span>Ver Sistema Completo (Acceso Directo)</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCampus(campus.id as CampusId);
                  }}
                  className="w-full py-2 px-4 rounded-xl bg-[#F7F6F4] hover:bg-[#E3E1DA] text-[#585757] font-medium text-xs transition-colors duration-200 flex items-center justify-center gap-1"
                >
                  <span>Iniciar Sesión Institucional</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
