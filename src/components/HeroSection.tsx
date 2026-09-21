import React from 'react';
import { SubsistemaLogo } from './SubsistemaLogo';
import { scrollToSelector } from '../utils/scrollToSelector';

export const HeroSection: React.FC = () => {
  return (
    <section id="hero-institutional" className="relative overflow-hidden bg-[#F7F6F4]">
      {/* Retícula institucional sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(3,73,145,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(3,73,145,0.045) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
        }}
      />
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-28 h-80 w-80 rounded-full bg-[#CD1719]/[0.06] blur-2xl" />
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-[#034991]/[0.07] blur-2xl" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.5fr_1fr] lg:gap-16 lg:py-24">
        {/* Copia editorial */}
        <div className="animate-rise" style={{ animationDelay: '0ms' }}>
          <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#034991]">
            <span aria-hidden className="h-2 w-2 rounded-[2px] bg-[#CD1719]" />
            Universidad Nacional · Campus Regional Chorotega
          </p>

          <h1 className="mt-5 font-goudy text-4xl font-semibold leading-[1.04] tracking-tight text-[#262624] sm:text-5xl lg:text-[3.4rem]">
            Sistema de estadísticas{' '}
            <br />
            <span className="relative inline-block">
              y atención al usuario
              <span
                aria-hidden
                className="absolute -bottom-1 left-0 h-2 w-full rounded bg-gradient-to-r from-[#CD1719] via-[#990000] to-[#034991] opacity-80 sm:-bottom-2"
              />
            </span>
          </h1>

          <p className="mt-7 max-w-xl text-[15px] leading-relaxed text-[#6B6A64]">
            Centraliza el registro de atenciones cotidianas de las Bibliotecas de
            la Región Chorotega y genera reportes automáticos por ciclo, sin
            hojas de cálculo.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={scrollToSelector}
              className="group inline-flex items-center gap-2.5 rounded-xl bg-[#990000] px-6 py-3 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#CD1719] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#990000] focus-visible:ring-offset-2"
            >
              Elegí tu biblioteca
              <svg
                className="h-4 w-4 transition-transform group-hover:translate-y-0.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />
              </svg>
            </button>
            <p className="text-xs text-[#6B6A64]">Dos campus · Nicoya y Liberia</p>
          </div>
        </div>

        {/* Sello institucional */}
        <aside className="animate-rise relative mx-auto w-full max-w-sm" style={{ animationDelay: '140ms' }}>
          <div aria-hidden className="absolute -bottom-3 -right-3 h-full w-full rounded-2xl border border-[#034991]/25" />
          <div className="relative flex flex-col items-center overflow-hidden rounded-2xl border border-[#E3E1DA] bg-white p-6 text-center shadow-sm sm:p-8">
            <div aria-hidden className="flex h-1 w-full">
              <div className="h-full flex-1 bg-[#CD1719]" />
              <div className="h-full flex-1 bg-[#034991]" />
            </div>

            <div className="mb-5 mt-6">
              <SubsistemaLogo size="md" />
            </div>

            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#034991]">
              Subsistema de Bibliotecas
            </span>
            <p className="mt-1 text-xs text-[#6B6A64]">
              Universidad Nacional, Costa Rica
            </p>

            <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-[#F7F6F4] px-3 py-1 text-[11px] font-semibold text-[#262624]">
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-[#034991]" />
              Campus Regional Chorotega
            </div>
          </div>
        </aside>
      </div>

      <div aria-hidden className="h-1.5 w-full bg-gradient-to-r from-[#CD1719] via-[#990000] to-[#034991]" />
    </section>
  );
};