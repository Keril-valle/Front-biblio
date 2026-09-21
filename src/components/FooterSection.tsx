import React from 'react';
import { CAMPUSES } from '../data/campuses';
import { UnaLogo } from './UnaLogo';

export const FooterSection: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <footer id="footer-institucional" className="mt-auto w-full border-t border-[#E3E1DA] bg-white">
      <div aria-hidden className="flex h-1 w-full">
        <div className="h-full flex-[3] bg-[#990000]" />
        <div className="h-full flex-1 bg-[#CD1719]" />
        <div className="h-full flex-1 bg-[#034991]" />
      </div>

      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Subsistema */}
        <div>
          <div className="flex items-center gap-3">
            <UnaLogo size="md" />
            <div className="leading-tight">
              <p className="text-sm font-bold text-[#262624]">Subsistema de Bibliotecas</p>
              <p className="text-[11px] text-[#6B6A64]">SIDUNA · Campus Regional Chorotega</p>
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-[#6B6A64]">
            Sistema de estadísticas que centraliza el registro de atenciones
            bibliotecarias de la región Chorotega y genera reportes por cada
            ciclo lectivo.
          </p>
          <p className="mt-4 font-goudy text-sm italic text-[#034991]">
            “UNA · Siempre necesaria para Costa Rica”
          </p>
        </div>

        {/* Bibliotecas */}
        <div>
          <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#990000]">
            Bibliotecas
          </h3>
          <ul className="space-y-3">
            {Object.values(CAMPUSES).map((campus) => (
              <li key={campus.id} className="text-xs">
                <span className="block font-semibold text-[#262624]">{campus.libraryName}</span>
                <span className="text-[#6B6A64]">
                  {campus.badge} · {campus.location}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Universidad Nacional */}
        <div>
          <h3 className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-[#034991]">
            Universidad Nacional
          </h3>
          <p className="text-xs leading-relaxed text-[#6B6A64]">
            Universidad pública de Costa Rica dedicada a la docencia, la
            investigación y la extensión en todo el territorio nacional.
          </p>
          <div className="mt-5 space-y-2 text-xs text-[#262624]">
            <p className="flex items-center gap-2">
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#CD1719]" />
              {CAMPUSES.nicoya.contactEmail}
            </p>
            <p className="flex items-center gap-2">
              <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-[#034991]" />
              {CAMPUSES.liberia.contactEmail}
            </p>
          </div>
        </div>
      </div>

      <div className="border-t border-black/10 bg-[#262624] px-4 py-3 text-center">
        <p className="text-[11px] text-[#F7F6F4]">
          © {year} Universidad Nacional · Subsistema de Bibliotecas — Sede
          Región Chorotega. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
};