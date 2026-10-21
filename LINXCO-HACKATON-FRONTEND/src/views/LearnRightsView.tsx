import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BookOpen, Shield, HelpCircle, ArrowRight } from 'lucide-react';

export const LearnRightsView: React.FC = () => {
  const navigate = useNavigate();
  const [selectedTopic, setSelectedTopic] = useState<'peticion' | 'tutela'>('peticion');

  return (
    <div className="flex flex-col gap-5 py-6">
      {/* Back button */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 py-1 px-2 rounded-md hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al inicio
        </button>
      </div>

      <div className="text-left">
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">
          Aprende tus derechos
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Conoce cómo defender tus garantías fundamentales sin necesidad de abogado.
        </p>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-200 rounded-xl">
        <button
          type="button"
          onClick={() => setSelectedTopic('peticion')}
          className={`min-h-[48px] py-2 px-3 text-xs font-black rounded-lg transition ${
            selectedTopic === 'peticion'
              ? 'bg-brand-900 text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          Derecho de Petición
        </button>
        <button
          type="button"
          onClick={() => setSelectedTopic('tutela')}
          className={`min-h-[48px] py-2 px-3 text-xs font-black rounded-lg transition ${
            selectedTopic === 'tutela'
              ? 'bg-brand-900 text-white shadow-sm'
              : 'text-slate-700 hover:text-slate-900'
          }`}
        >
          Acción de Tutela
        </button>
      </div>

      {/* Topic Content */}
      {selectedTopic === 'peticion' ? (
        <article className="flex flex-col gap-4 bg-slate-50 p-4 rounded-xl border-2 border-slate-300">
          <div className="flex items-center gap-2 text-brand-900">
            <BookOpen className="w-5 h-5 shrink-0" />
            <h3 className="text-base font-black">¿Qué es el Derecho de Petición? (Art. 23)</h3>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            Es la facultad que tiene todo ciudadano en Colombia de solicitar información, documentos,
            o la solución de un problema ante cualquier entidad pública o empresa de servicios
            básicos.
          </p>

          <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-900">Tiempos de respuesta:</span>
            <ul className="text-xs text-slate-600 list-disc list-inside space-y-1">
              <li>Peticiones de información o copias: <strong>10 días hábiles</strong>.</li>
              <li>Peticiones de interés general o particular: <strong>15 días hábiles</strong>.</li>
              <li>Consultas sobre materias a su cargo: <strong>30 días hábiles</strong>.</li>
            </ul>
          </div>

          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
            <span className="text-xs font-black text-brand-950 block mb-1">
              Casos comunes en tu Vereda:
            </span>
            <p className="text-xs text-slate-700 leading-relaxed">
              Falta de profesores en la escuela rural, transporte escolar, arreglos de vías
              terciarias y carreteras, o solicitud de electrificación rural.
            </p>
          </div>
        </article>
      ) : (
        <article className="flex flex-col gap-4 bg-slate-50 p-4 rounded-xl border-2 border-slate-300">
          <div className="flex items-center gap-2 text-brand-900">
            <Shield className="w-5 h-5 shrink-0" />
            <h3 className="text-base font-black">¿Qué es la Acción de Tutela? (Art. 86)</h3>
          </div>
          <p className="text-xs text-slate-700 leading-relaxed">
            Es un mecanismo judicial preferente y sumario para la protección inmediata de tus
            derechos constitucionales fundamentales (Salud, Vida, Educación de menores, Agua potable)
            cuando son vulnerados o amenazados.
          </p>

          <div className="bg-white p-3 rounded-lg border border-slate-200 flex flex-col gap-1.5">
            <span className="text-xs font-bold text-slate-900">Plazo perentorio de fallo:</span>
            <p className="text-xs text-slate-600">
              El juez debe fallar en un término máximo e improrrogable de <strong>10 días</strong>.
            </p>
          </div>

          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
            <span className="text-xs font-black text-brand-950 block mb-1">
              Casos urgentes de tutela:
            </span>
            <p className="text-xs text-slate-700 leading-relaxed">
              No entrega de medicamentos esenciales, negación de cirugías vitales, falta de agua
              potable mínima para la familia o falta de cupo escolar para menores.
            </p>
          </div>
        </article>
      )}

      {/* Action triggers */}
      <div className="flex flex-col gap-3 mt-2">
        <button
          type="button"
          onClick={() => navigate('/portal')}
          className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-brand-900 hover:bg-brand-950 text-white font-bold text-sm flex items-center justify-between border-2 border-brand-950 shadow-sm"
        >
          <span>Iniciar trámite de petición o tutela</span>
          <ArrowRight className="w-4 h-4 text-emerald-300" />
        </button>

        <button
          type="button"
          onClick={() => navigate('/asesor')}
          className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-white hover:bg-slate-50 text-slate-900 font-bold text-sm flex items-center justify-between border-2 border-slate-700"
        >
          <div className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-slate-700" />
            <span>Consultar caso con un asesor</span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>
    </div>
  );
};
