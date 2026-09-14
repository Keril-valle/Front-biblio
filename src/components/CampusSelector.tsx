import React from 'react';
import { CAMPUSES } from '../data/campuses';
import { LibraryLogo } from './LibraryLogos';
import { CampusId } from '../types';

interface CampusSelectorProps {
  onSelectCampus: (campusId: CampusId) => void;
  selectedCampus?: CampusId | null;
}

interface CampusAccent {
  bar: string;
  hoverBar: string;
  ring: string;
  badge: string;
  nameHover: string;
  borderHover: string;
  button: string;
}

const ACCENT: Record<CampusId, CampusAccent> = {
  nicoya: {
    bar: 'bg-[#990000]',
    hoverBar: 'group-hover:bg-[#990000]',
    ring: 'ring-[#990000]',
    badge: 'text-[#990000]',
    nameHover: 'group-hover:text-[#990000]',
    borderHover: 'hover:border-[#990000]',
    button: 'bg-[#990000] hover:bg-[#CD1719]',
  },
  liberia: {
    bar: 'bg-[#034991]',
    hoverBar: 'group-hover:bg-[#034991]',
    ring: 'ring-[#034991]',
    badge: 'text-[#034991]',
    nameHover: 'group-hover:text-[#034991]',
    borderHover: 'hover:border-[#034991]',
    button: 'bg-[#034991] hover:bg-[#0a5cbd]',
  },
};

export const CampusSelector: React.FC<CampusSelectorProps> = ({
  onSelectCampus,
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
      className="mx-auto w-full max-w-5xl scroll-mt-20 px-4 py-14 sm:px-6 sm:py-20"
      aria-labelledby="selector-heading"
    >
      <div className="mb-10 text-center">
        <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#034991]">
          <span aria-hidden className="h-2 w-2 rounded-[2px] bg-[#CD1719]" />
          Acceso al sistema
        </p>
        <h2
          id="selector-heading"
          className="mt-3 font-goudy text-2xl font-semibold tracking-tight text-[#262624] sm:text-3xl"
        >
          ¿Desde qué biblioteca ingresás?
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#6B6A64]">
          Elegí tu campus para entrar al sistema del Subsistema de Bibliotecas e
          iniciar sesión con tu cuenta @una.cr.
        </p>
      </div>

      <div className="grid grid-cols-1 items-stretch gap-6 sm:gap-8 md:grid-cols-2">
        {campusList.map((campus) => {
          const accent = ACCENT[campus.id as CampusId];
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
              className={`group relative flex cursor-pointer flex-col items-center justify-between rounded-2xl border bg-white p-6 outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-offset-2 sm:p-8 ${accent.ring} ${
                isSelected
                  ? 'border-transparent shadow-md ring-1'
                  : `border-[#E3E1DA] ${accent.borderHover} hover:-translate-y-0.5 hover:shadow-md`
              }`}
            >
              <span
                aria-hidden
                className={`absolute inset-x-0 top-0 h-1 rounded-t-2xl transition-colors duration-200 ${
                  isSelected ? accent.bar : `bg-transparent ${accent.hoverBar}`
                }`}
              />

              <div className="my-2 flex min-h-[140px] w-full items-center justify-center">
                <LibraryLogo campusId={campus.id as CampusId} />
              </div>

              <div className="mt-2 flex flex-col items-center text-center">
                <span className={`text-xs font-bold uppercase tracking-widest ${accent.badge} mb-1`}>
                  {campus.badge}
                </span>
                <h3
                  className={`font-goudy text-lg font-medium text-[#262624] transition-colors duration-200 sm:text-xl ${accent.nameHover}`}
                >
                  {campus.libraryName}
                </h3>
                <span className="mt-0.5 text-xs text-[#6B6A64]">{campus.location}</span>
              </div>

              <div className="mt-6 w-full space-y-3">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCampus(campus.id as CampusId);
                  }}
                  className={`flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors duration-200 ${accent.button}`}
                >
                  <span>Entrar al sistema</span>
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </button>
                <p className="flex items-center justify-center gap-1.5 text-[11px] text-[#A7A7A9]">
                  <svg
                    className="h-3.5 w-3.5"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {campus.schedule}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};