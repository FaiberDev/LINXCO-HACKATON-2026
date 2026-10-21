import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  BookOpenText,
  ShieldCheck,
  Question,
  ArrowRight,
  ClockCountdown,
  Plant,
} from '@phosphor-icons/react';

import casaAdobeImg from '../assets/images/casa-adobe-sm.webp';

export const LearnRightsView: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState<'peticion' | 'tutela'>('peticion');

  return (
    <div className="flex flex-col gap-6 py-6">
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-charcoal-800 hover:text-institucional-600 py-1.5 px-3 rounded-xl hover:bg-olive-100 transition"
        >
          <ArrowLeft weight="bold" className="w-4 h-4" />
          Volver al inicio
        </button>
      </div>

      {/* Hero Header */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-charcoal-900 p-6 sm:p-8 text-white shadow-md">
        <img
          src={casaAdobeImg}
          alt="Vivienda rural tradicional colombiana"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-charcoal-950/95 via-charcoal-900/85 to-institucional-950/75"
        />
        <div className="relative z-10 max-w-2xl space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-olive-300 text-charcoal-950">
            <Plant weight="duotone" className="w-4 h-4" />
            <span>Pedagogía Constitucional Rural</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-editorial">
            Aprende tus derechos
          </h2>
          <p className="text-xs sm:text-sm text-olive-100 leading-relaxed">
            Conoce cómo defender tus garantías fundamentales sin necesidad de abogado.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-2.5 p-1.5 bg-olive-100 border-2 border-olive-300 rounded-2xl">
        <button
          type="button"
          onClick={() => setSelectedTopic('peticion')}
          className={`min-h-[50px] py-2.5 px-4 text-xs sm:text-sm font-black rounded-xl transition flex items-center justify-center gap-2 ${
            selectedTopic === 'peticion'
              ? 'bg-institucional-500 text-white shadow-sm border border-charcoal-900'
              : 'text-charcoal-800 hover:text-charcoal-950 hover:bg-white/60'
          }`}
        >
          <BookOpenText weight="duotone" className="w-5 h-5 shrink-0" />
          <span>Derecho de Petición</span>
        </button>
        <button
          type="button"
          onClick={() => setSelectedTopic('tutela')}
          className={`min-h-[50px] py-2.5 px-4 text-xs sm:text-sm font-black rounded-xl transition flex items-center justify-center gap-2 ${
            selectedTopic === 'tutela'
              ? 'bg-institucional-500 text-white shadow-sm border border-charcoal-900'
              : 'text-charcoal-800 hover:text-charcoal-950 hover:bg-white/60'
          }`}
        >
          <ShieldCheck weight="duotone" className="w-5 h-5 shrink-0" />
          <span>Acción de Tutela</span>
        </button>
      </div>

      {/* Topic Content */}
      {selectedTopic === 'peticion' ? (
        <article className="flex flex-col gap-5 bg-white p-6 rounded-3xl border-2 border-charcoal-800 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3 text-institucional-700">
            <div className="w-11 h-11 rounded-2xl bg-institucional-50 border border-institucional-200 flex items-center justify-center shrink-0">
              <BookOpenText weight="duotone" className="w-6 h-6 text-institucional-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-charcoal-950 font-editorial">
              ¿Qué es el Derecho de Petición? (Art. 23)
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-charcoal-800 leading-relaxed">
            Es la facultad que tiene todo ciudadano en Colombia de solicitar información, documentos,
            o la solución de un problema ante cualquier entidad pública o empresa de servicios
            básicos.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-charcoal-50 p-4 rounded-2xl border border-charcoal-200 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-black text-charcoal-950">
                <ClockCountdown weight="duotone" className="w-4 h-4 text-institucional-600" />
                <span>Tiempos de respuesta:</span>
              </div>
              <ul className="text-xs text-charcoal-700 list-disc list-inside space-y-1.5">
                <li>Peticiones de información o copias: <strong>10 días hábiles</strong>.</li>
                <li>Peticiones de interés general o particular: <strong>15 días hábiles</strong>.</li>
                <li>Consultas sobre materias a su cargo: <strong>30 días hábiles</strong>.</li>
              </ul>
            </div>

            <div className="bg-olive-50 p-4 rounded-2xl border border-olive-300 flex flex-col justify-center">
              <span className="text-xs font-black text-charcoal-950 block mb-1.5">
                Casos comunes en tu Vereda:
              </span>
              <p className="text-xs text-charcoal-800 leading-relaxed">
                Falta de profesores en la escuela rural, transporte escolar, arreglos de vías
                terciarias y carreteras, o solicitud de electrificación rural.
              </p>
            </div>
          </div>
        </article>
      ) : (
        <article className="flex flex-col gap-5 bg-white p-6 rounded-3xl border-2 border-charcoal-800 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-3 text-institucional-700">
            <div className="w-11 h-11 rounded-2xl bg-institucional-50 border border-institucional-200 flex items-center justify-center shrink-0">
              <ShieldCheck weight="duotone" className="w-6 h-6 text-institucional-600" />
            </div>
            <h3 className="text-lg sm:text-xl font-black text-charcoal-950 font-editorial">
              ¿Qué es la Acción de Tutela? (Art. 86)
            </h3>
          </div>
          <p className="text-xs sm:text-sm text-charcoal-800 leading-relaxed">
            Es un mecanismo judicial preferente y sumario para la protección inmediata de tus
            derechos constitucionales fundamentales (Salud, Vida, Educación de menores, Agua potable)
            cuando son vulnerados o amenazados.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-charcoal-50 p-4 rounded-2xl border border-charcoal-200 flex flex-col justify-center gap-1.5">
              <div className="flex items-center gap-1.5 text-xs font-black text-charcoal-950">
                <ClockCountdown weight="duotone" className="w-4 h-4 text-institucional-600" />
                <span>Plazo perentorio de fallo:</span>
              </div>
              <p className="text-xs text-charcoal-700 leading-relaxed">
                El juez debe fallar en un término máximo e improrrogable de <strong>10 días</strong>.
              </p>
            </div>

            <div className="bg-olive-50 p-4 rounded-2xl border border-olive-300 flex flex-col justify-center">
              <span className="text-xs font-black text-charcoal-950 block mb-1.5">
                Casos urgentes de tutela:
              </span>
              <p className="text-xs text-charcoal-800 leading-relaxed">
                No entrega de medicamentos esenciales, negación de cirugías vitales, falta de agua
                potable mínima para la familia o falta de cupo escolar para menores.
              </p>
            </div>
          </div>
        </article>
      )}

      {/* Action triggers */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-1">
        <button
          type="button"
          onClick={() => navigate('/portal')}
          className="w-full min-h-[52px] px-5 py-3 rounded-2xl bg-institucional-500 hover:bg-institucional-600 text-white font-bold text-sm flex items-center justify-between border-2 border-charcoal-950 shadow-sm transition"
        >
          <span>Iniciar trámite de petición o tutela</span>
          <ArrowRight weight="bold" className="w-4 h-4 text-aqua-300" />
        </button>

        <button
          type="button"
          onClick={() => navigate('/asesor')}
          className="w-full min-h-[52px] px-5 py-3 rounded-2xl bg-white hover:bg-olive-50 text-charcoal-900 font-bold text-sm flex items-center justify-between border-2 border-charcoal-800 transition"
        >
          <div className="flex items-center gap-2">
            <Question weight="duotone" className="w-5 h-5 text-institucional-600" />
            <span>Consultar caso con un asesor</span>
          </div>
          <ArrowRight weight="bold" className="w-4 h-4 text-charcoal-500" />
        </button>
      </div>
    </div>
  );
};
