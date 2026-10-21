import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, BookOpen, MessageSquare, ArrowRight } from 'lucide-react';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col gap-6 py-6">
      {/* Hero Section */}
      <section className="text-center flex flex-col items-center gap-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-100 text-brand-900 border border-brand-300">
          Orientación jurídica rural y comunitaria
        </span>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight leading-snug">
          Justicia rápida, clara y sin intermediarios
        </h2>
        <p className="text-sm text-slate-700 leading-relaxed max-w-sm">
          Defiende tu salud, la educación de tus hijos y las necesidades de tu vereda mediante
          Derechos de Petición y Acciones de Tutela con respaldo constitucional.
        </p>
      </section>

      {/* Primary Action Buttons (R2 Requirements) */}
      <nav aria-label="Acciones principales" className="flex flex-col gap-4 mt-2">
        {/* 1. Protege tus derechos */}
        <button
          type="button"
          onClick={() => navigate('/portal')}
          className="w-full min-h-[56px] px-5 py-4 rounded-xl bg-brand-900 hover:bg-brand-950 text-white font-bold text-base flex items-center justify-between border-2 border-brand-950 shadow-md active:scale-[0.99] transition focus:ring-4 focus:ring-brand-700"
        >
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-lg bg-emerald-800 flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-emerald-200" />
            </div>
            <div>
              <span className="block text-base font-black">Protege tus derechos</span>
              <span className="block text-xs font-normal text-emerald-200">
                Radica peticiones y tutelas en minutos
              </span>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-emerald-300 shrink-0" />
        </button>

        {/* 2. Aprende tus derechos */}
        <button
          type="button"
          onClick={() => navigate('/aprender')}
          className="w-full min-h-[52px] px-5 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-900 font-bold text-base flex items-center justify-between border-2 border-slate-700 shadow-sm active:scale-[0.99] transition focus:ring-4 focus:ring-slate-400"
        >
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <BookOpen className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <span className="block text-base font-black">Aprende tus derechos</span>
              <span className="block text-xs font-normal text-slate-600">
                Guía práctica: Salud, Educación y Vías
              </span>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-500 shrink-0" />
        </button>

        {/* 3. Habla con un asesor */}
        <button
          type="button"
          onClick={() => navigate('/asesor')}
          className="w-full min-h-[52px] px-5 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-900 font-bold text-base flex items-center justify-between border-2 border-slate-700 shadow-sm active:scale-[0.99] transition focus:ring-4 focus:ring-slate-400"
        >
          <div className="flex items-center gap-3 text-left">
            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
              <MessageSquare className="w-5 h-5 text-slate-700" />
            </div>
            <div>
              <span className="block text-base font-black">Habla con un asesor</span>
              <span className="block text-xs font-normal text-slate-600">
                Atención directa con Consultorio Jurídico
              </span>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-500 shrink-0" />
        </button>
      </nav>

      {/* Informative Highlights */}
      <section className="bg-emerald-50/70 border-2 border-emerald-200 rounded-xl p-4 mt-2">
        <h3 className="font-bold text-sm text-brand-950 mb-1">Totalmente gratuito y sin costo</h3>
        <p className="text-xs text-slate-700 leading-relaxed">
          Los Derechos de Petición y Tutelas no requieren abogado según los artículos 23 y 86 de la
          Constitución Política de Colombia.
        </p>
      </section>
    </div>
  );
};
