import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  BookOpenText,
  ChatsTeardrop,
  ArrowRight,
  Plant,
  Scales,
  Smiley,
} from '@phosphor-icons/react';

import heroPuebloImg from '../assets/images/pueblo-andino-lg.webp';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col justify-between gap-10 py-8 lg:py-12 flex-1">
      {/* Hero Section minimalista con imagen de zona rural de alta resolución y overlay oscuro */}
      <section className="relative rounded-3xl overflow-hidden border-2 border-charcoal-900 shadow-lg min-h-[340px] lg:min-h-[420px] flex items-center">
        <img
          src={heroPuebloImg}
          alt="Panorámica de municipio y zona rural andina de Colombia"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Overlay oscuro institucional para garantizar contraste WCAG AAA */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-[#1e1e1b]/95 via-[#353531]/85 to-[#1c2e50]/65"
        />

        <div className="relative z-10 w-full p-8 sm:p-12 lg:p-16 xl:p-20 max-w-4xl flex flex-col items-start text-left gap-5">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold bg-olive-300 text-charcoal-950 border border-olive-400">
            <Plant weight="duotone" className="w-4 h-4 text-charcoal-900" />
            <span>Orientación jurídica rural y comunitaria</span>
          </span>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] font-editorial">
            Justicia rápida, clara y sin intermediarios
          </h2>

          <p className="text-base sm:text-lg lg:text-xl text-olive-100 leading-relaxed max-w-2xl font-medium">
            Defiende tu salud, la educación de tus hijos y las necesidades de tu vereda mediante
            Derechos de Petición y Acciones de Tutela con respaldo constitucional.
          </p>
        </div>
      </section>

      {/* 3 Acciones Principales — Tarjetas amplias, limpias y directas para pantallas rurales y monitores 1980x1024 */}
      <nav
        aria-label="Acciones principales"
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        {/* 1. Protege tus derechos */}
        <button
          type="button"
          onClick={() => navigate('/portal')}
          className="w-full min-h-[56px] p-6 sm:p-8 rounded-3xl bg-institucional-500 hover:bg-institucional-600 text-white font-bold text-base flex items-center justify-between border-2 border-charcoal-950 shadow-md active:scale-[0.99] transition focus:ring-4 focus:ring-aqua-400 group"
        >
          <div className="flex items-center gap-4 text-left">
            <div className="w-14 h-14 rounded-2xl bg-charcoal-900/90 flex items-center justify-center shrink-0 border border-aqua-400/50">
              <ShieldCheck weight="duotone" className="w-7 h-7 text-aqua-400" />
            </div>
            <div>
              <span className="block text-lg sm:text-xl font-black leading-snug font-editorial">
                Protege tus derechos
              </span>
              <span className="block text-xs sm:text-sm font-medium text-aqua-100 mt-1">
                Radica peticiones y tutelas en minutos
              </span>
            </div>
          </div>
          <ArrowRight
            weight="bold"
            className="w-6 h-6 text-aqua-300 shrink-0 group-hover:translate-x-1 transition-transform"
          />
        </button>

        {/* 2. Aprende tus derechos */}
        <button
          type="button"
          onClick={() => navigate('/aprender')}
          className="w-full min-h-[56px] p-6 sm:p-8 rounded-3xl bg-white hover:bg-olive-50 text-charcoal-900 font-bold text-base flex items-center justify-between border-2 border-charcoal-800 shadow-sm active:scale-[0.99] transition focus:ring-4 focus:ring-olive-400 group"
        >
          <div className="flex items-center gap-4 text-left">
            <div className="w-14 h-14 rounded-2xl bg-olive-200 flex items-center justify-center shrink-0 border border-olive-400">
              <BookOpenText weight="duotone" className="w-7 h-7 text-charcoal-900" />
            </div>
            <div>
              <span className="block text-lg sm:text-xl font-black leading-snug font-editorial">
                Aprende tus derechos
              </span>
              <span className="block text-xs sm:text-sm font-medium text-charcoal-600 mt-1">
                Guía práctica: Salud, Educación y Vías
              </span>
            </div>
          </div>
          <ArrowRight
            weight="bold"
            className="w-6 h-6 text-institucional-600 shrink-0 group-hover:translate-x-1 transition-transform"
          />
        </button>

        {/* 3. Habla con un asesor */}
        <button
          type="button"
          onClick={() => navigate('/asesor')}
          className="w-full min-h-[56px] p-6 sm:p-8 rounded-3xl bg-white hover:bg-olive-50 text-charcoal-900 font-bold text-base flex items-center justify-between border-2 border-charcoal-800 shadow-sm active:scale-[0.99] transition focus:ring-4 focus:ring-olive-400 group"
        >
          <div className="flex items-center gap-4 text-left">
            <div className="w-14 h-14 rounded-2xl bg-aqua-100 flex items-center justify-center shrink-0 border border-aqua-400">
              <ChatsTeardrop weight="duotone" className="w-7 h-7 text-institucional-700" />
            </div>
            <div>
              <span className="block text-lg sm:text-xl font-black leading-snug font-editorial">
                Habla con un asesor
              </span>
              <span className="block text-xs sm:text-sm font-medium text-charcoal-600 mt-1">
                Atención directa con Consultorio Jurídico
              </span>
            </div>
          </div>
          <ArrowRight
            weight="bold"
            className="w-6 h-6 text-institucional-600 shrink-0 group-hover:translate-x-1 transition-transform"
          />
        </button>
      </nav>

      {/* Sección Para Niños: Semillero de Derechos */}
      <section className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-amber-100 via-amber-50 to-olive-100 border-2 border-charcoal-900 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-400 border-2 border-charcoal-900 flex items-center justify-center text-charcoal-950 shrink-0 shadow-sm">
            <Smiley weight="fill" className="w-8 h-8 text-charcoal-950" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-300 text-charcoal-900 border border-amber-500 font-mono">
                Semillero de Derechos
              </span>
              <span className="text-xs font-bold text-charcoal-700">3 Videos Animados</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-charcoal-950 font-editorial">
              Sección para Niñas, Niños y Jóvenes
            </h3>
            <p className="text-xs sm:text-sm text-charcoal-700 mt-0.5">
              ¿Qué son los deberes y derechos? ¿Qué es la Constitución? Aprende con videos sencillos y divertidos.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/ninos')}
          className="min-h-[52px] px-6 py-3 rounded-xl bg-charcoal-900 hover:bg-institucional-600 text-white font-black text-xs sm:text-sm border border-charcoal-950 shadow-sm transition shrink-0 active:scale-95 inline-flex items-center gap-2"
        >
          <span>Ver Videos para Niños</span>
          <ArrowRight weight="bold" className="w-4 h-4 text-aqua-300" />
        </button>
      </section>

      {/* Franja minimalista de respaldo constitucional (sin saturación visual) */}
      <section className="p-5 sm:p-6 rounded-2xl bg-olive-100/70 border border-olive-300 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-charcoal-900 text-olive-300 flex items-center justify-center shrink-0">
            <Scales weight="duotone" className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-black text-sm sm:text-base text-charcoal-950 font-editorial">
              Totalmente gratuito y sin costo
            </h3>
            <p className="text-xs sm:text-sm text-charcoal-700">
              Los Derechos de Petición y Tutelas no requieren abogado según los artículos 23 y 86 de la Constitución Política.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
