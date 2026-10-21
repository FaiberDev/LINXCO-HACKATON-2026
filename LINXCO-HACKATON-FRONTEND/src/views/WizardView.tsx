import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCase } from '../context/CaseContext';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Copy,
  AlertCircle,
  Loader2,
  FileCheck2,
} from 'lucide-react';

const CATEGORIAS = [
  { id: 'SALUD', label: 'Salud y bienestar', icon: '🏥' },
  { id: 'EDUCACION', label: 'Educación y escuela', icon: '📚' },
  { id: 'VEREDA', label: 'Mi vereda y vías', icon: '🛣️' },
  { id: 'OTRO', label: 'Otro asunto legal', icon: '⚖️' },
];

export const WizardView: React.FC = () => {
  const navigate = useNavigate();
  const {
    activeCode,
    activeCase,
    wizardDraft,
    updateWizardDraft,
    saveCase,
    modifyCase,
    clearWizardDraft,
  } = useCase();

  const [step, setStep] = useState<number>(wizardDraft.paso_actual || 1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submittedCode, setSubmittedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Field change helper
  const handleFieldChange = (key: string, value: unknown) => {
    updateWizardDraft({ [key]: value, paso_actual: step });
  };

  const handleCitizenChange = (key: string, value: string) => {
    updateWizardDraft({
      ciudadano: {
        ...(wizardDraft.ciudadano || {
          nombre_completo: '',
          numero_documento: '',
          telefono: '',
        }),
        [key]: value,
      },
      paso_actual: step,
    });
  };

  const validateCurrentStep = (): boolean => {
    setErrorMsg(null);
    if (step === 1) {
      if (!wizardDraft.mecanismo) {
        setErrorMsg('Selecciona el mecanismo legal (Derecho de petición o Tutela).');
        return false;
      }
      if (!wizardDraft.categoria) {
        setErrorMsg('Selecciona la categoría del problema.');
        return false;
      }
    } else if (step === 2) {
      const c = wizardDraft.ciudadano;
      if (!c?.nombre_completo?.trim()) {
        setErrorMsg('Ingresa tu nombre completo.');
        return false;
      }
      if (!c?.numero_documento?.trim()) {
        setErrorMsg('Ingresa tu número de documento.');
        return false;
      }
      if (!c?.telefono?.trim()) {
        setErrorMsg('Ingresa tu teléfono de contacto.');
        return false;
      }
    } else if (step === 3) {
      const entidadNombre =
        typeof wizardDraft.entidad === 'object'
          ? wizardDraft.entidad?.nombre
          : wizardDraft.entidad;
      if (!entidadNombre || !entidadNombre.trim()) {
        setErrorMsg('Indica la entidad o autoridad a la que va dirigida la solicitud.');
        return false;
      }
    } else if (step === 4) {
      if (!wizardDraft.hechos || wizardDraft.hechos.trim().length < 15) {
        setErrorMsg('Describe los hechos de manera clara (mínimo 15 caracteres).');
        return false;
      }
    } else if (step === 5) {
      if (!wizardDraft.peticion || wizardDraft.peticion.trim().length < 10) {
        setErrorMsg('Especifica qué solicitas con claridad (mínimo 10 caracteres).');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateCurrentStep()) {
      const next = step + 1;
      setStep(next);
      updateWizardDraft({ paso_actual: next });
    }
  };

  const prevStep = () => {
    setErrorMsg(null);
    const prev = Math.max(1, step - 1);
    setStep(prev);
    updateWizardDraft({ paso_actual: prev });
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;
    setIsSubmitting(true);
    setErrorMsg(null);

    const entidadNombre =
      typeof wizardDraft.entidad === 'object'
        ? wizardDraft.entidad?.nombre
        : wizardDraft.entidad;

    const payload = {
      tipo_problema: `${wizardDraft.mecanismo} (${wizardDraft.categoria}: ${
        wizardDraft.problema || 'Trámite web'
      })`,
      estado: 'VALIDADO' as const,
      formulario_web: {
        ...wizardDraft,
        entidad: {
          nombre: entidadNombre || 'Entidad competente',
        },
        peticiones: wizardDraft.peticion,
      },
    };

    try {
      let result;
      if (activeCode || activeCase?.codigo_sms) {
        const codeToUpdate = activeCode || activeCase?.codigo_sms || '';
        result = await modifyCase(codeToUpdate, payload);
      } else {
        result = await saveCase(payload);
      }

      setSubmittedCode(result.codigo_sms);
      clearWizardDraft();
    } catch (err: unknown) {
      setErrorMsg((err as Error)?.message || 'Error al enviar el formulario. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (submittedCode) {
      navigator.clipboard?.writeText(submittedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Confirmation view on submission
  if (submittedCode) {
    return (
      <div className="flex flex-col gap-6 py-6 text-center animate-fadeIn">
        <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-600 text-emerald-800 mx-auto flex items-center justify-center">
          <CheckCircle className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-900">¡Trámite radicado exitosamente!</h2>
          <p className="text-sm text-slate-600 mt-2">
            Hemos generado tu documento formal. Guarda tu código para consultar avances o
            recibir la respuesta.
          </p>
        </div>

        <div className="p-4 bg-emerald-50 rounded-xl border-2 border-emerald-300 flex flex-col gap-2">
          <span className="text-xs font-bold text-brand-950 uppercase">
            Código de seguimiento del caso
          </span>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-mono font-black text-brand-900 tracking-wider">
              {submittedCode}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              aria-label="Copiar código al portapapeles"
              className="p-2 rounded-lg bg-white border border-brand-300 text-brand-900 hover:bg-brand-100"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
          {copied && <span className="text-xs text-brand-700 font-bold">¡Código copiado!</span>}
        </div>

        <div className="flex flex-col gap-3 mt-4">
          <button
            type="button"
            onClick={() => navigate(`/estado/${encodeURIComponent(submittedCode)}`)}
            className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-brand-900 text-white font-bold text-sm border-2 border-brand-950"
          >
            Ver estado y progreso del trámite
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-white text-slate-900 font-bold text-sm border-2 border-slate-700"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 py-6">
      {/* Header with back navigation & Step progress */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={step === 1 ? () => navigate('/portal') : prevStep}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:text-slate-900 py-1 px-2 rounded-md hover:bg-slate-100"
        >
          <ArrowLeft className="w-4 h-4" />
          {step === 1 ? 'Portal' : 'Anterior'}
        </button>

        <span className="text-xs font-black uppercase tracking-wider text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-300">
          Paso {step} de 6
        </span>
      </div>

      {/* Segmented Progress Bar */}
      <div className="grid grid-cols-6 gap-1.5 w-full">
        {[1, 2, 3, 4, 5, 6].map((s) => (
          <div
            key={s}
            className={`h-2 rounded-full transition-all ${
              s <= step ? 'bg-brand-900' : 'bg-slate-200'
            }`}
          />
        ))}
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="p-3 bg-red-50 border-2 border-red-300 rounded-lg text-xs text-red-800 flex items-start gap-2"
        >
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* STEP 1: Mecanismo & Categoría */}
      {step === 1 && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <div>
            <h3 className="text-xl font-black text-slate-900">¿Qué trámite deseas radicar?</h3>
            <p className="text-xs text-slate-600 mt-1">
              Elige el instrumento y el área temática de tu solicitud.
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-black uppercase text-slate-800">Mecanismo legal *</label>
            <div className="grid grid-cols-2 gap-2">
              {['Derecho de petición', 'Acción de tutela'].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleFieldChange('mecanismo', m)}
                  className={`min-h-[52px] p-3 rounded-xl border-2 text-left font-bold text-xs transition ${
                    wizardDraft.mecanismo === m
                      ? 'border-brand-900 bg-brand-50 text-brand-950 ring-2 ring-brand-900'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500'
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-black uppercase text-slate-800">Categoría del problema *</label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIAS.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleFieldChange('categoria', cat.id)}
                  className={`min-h-[56px] p-3 rounded-xl border-2 text-left font-bold text-xs flex items-center gap-2 transition ${
                    wizardDraft.categoria === cat.id
                      ? 'border-brand-900 bg-brand-50 text-brand-950 ring-2 ring-brand-900'
                      : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500'
                  }`}
                >
                  <span className="text-lg">{cat.icon}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: Datos del Ciudadano */}
      {step === 2 && (
        <div className="flex flex-col gap-3 animate-fadeIn">
          <div>
            <h3 className="text-xl font-black text-slate-900">¿Quién presenta la solicitud?</h3>
            <p className="text-xs text-slate-600 mt-1">
              Datos para notificación formal y comunicación directa.
            </p>
          </div>

          <div>
            <label htmlFor="nombre_completo" className="block text-xs font-bold text-slate-800 uppercase mb-1">
              Nombre completo *
            </label>
            <input
              id="nombre_completo"
              type="text"
              required
              value={wizardDraft.ciudadano?.nombre_completo || ''}
              onChange={(e) => handleCitizenChange('nombre_completo', e.target.value)}
              placeholder="Ej: Carlos Gómez"
              className="w-full min-h-[48px] px-3 py-2 text-sm rounded-lg border-2 border-slate-400 focus:border-brand-900 text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="tipo_documento" className="block text-xs font-bold text-slate-800 uppercase mb-1">
                Tipo doc.
              </label>
              <select
                id="tipo_documento"
                value={wizardDraft.ciudadano?.tipo_documento || 'CC'}
                onChange={(e) => handleCitizenChange('tipo_documento', e.target.value)}
                className="w-full min-h-[48px] px-2 py-2 text-sm rounded-lg border-2 border-slate-400 focus:border-brand-900 text-slate-900"
              >
                <option value="CC">Cédula (CC)</option>
                <option value="TI">Tarjeta Identidad (TI)</option>
                <option value="CE">Cédula Extranjería (CE)</option>
                <option value="PPT">Permiso Temporal (PPT)</option>
              </select>
            </div>
            <div>
              <label htmlFor="numero_documento" className="block text-xs font-bold text-slate-800 uppercase mb-1">
                Número doc. *
              </label>
              <input
                id="numero_documento"
                type="text"
                required
                value={wizardDraft.ciudadano?.numero_documento || ''}
                onChange={(e) => handleCitizenChange('numero_documento', e.target.value)}
                placeholder="12345678"
                className="w-full min-h-[48px] px-3 py-2 text-sm rounded-lg border-2 border-slate-400 focus:border-brand-900 text-slate-900"
              />
            </div>
          </div>

          <div>
            <label htmlFor="telefono_ciudadano" className="block text-xs font-bold text-slate-800 uppercase mb-1">
              Teléfono / WhatsApp *
            </label>
            <input
              id="telefono_ciudadano"
              type="tel"
              required
              value={wizardDraft.ciudadano?.telefono || ''}
              onChange={(e) => handleCitizenChange('telefono', e.target.value)}
              placeholder="Ej: 3201234567"
              className="w-full min-h-[48px] px-3 py-2 text-sm rounded-lg border-2 border-slate-400 focus:border-brand-900 text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="municipio_ciudadano" className="block text-xs font-bold text-slate-800 uppercase mb-1">
                Municipio
              </label>
              <input
                id="municipio_ciudadano"
                type="text"
                value={wizardDraft.ciudadano?.municipio || ''}
                onChange={(e) => handleCitizenChange('municipio', e.target.value)}
                placeholder="Ej: Fusagasugá"
                className="w-full min-h-[48px] px-3 py-2 text-sm rounded-lg border-2 border-slate-400 focus:border-brand-900 text-slate-900"
              />
            </div>
            <div>
              <label htmlFor="vereda_ciudadano" className="block text-xs font-bold text-slate-800 uppercase mb-1">
                Vereda / Sector
              </label>
              <input
                id="vereda_ciudadano"
                type="text"
                value={wizardDraft.ciudadano?.vereda || ''}
                onChange={(e) => handleCitizenChange('vereda', e.target.value)}
                placeholder="Ej: La Aguadita"
                className="w-full min-h-[48px] px-3 py-2 text-sm rounded-lg border-2 border-slate-400 focus:border-brand-900 text-slate-900"
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Entidad Destinataria */}
      {step === 3 && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <div>
            <h3 className="text-xl font-black text-slate-900">¿A quién se le reclama?</h3>
            <p className="text-xs text-slate-600 mt-1">
              Indica la institución pública, EPS, colegio o empresa responsable.
            </p>
          </div>

          <div>
            <label htmlFor="entidad_nombre" className="block text-xs font-bold text-slate-800 uppercase mb-1">
              Nombre de la entidad o autoridad *
            </label>
            <input
              id="entidad_nombre"
              type="text"
              required
              value={
                typeof wizardDraft.entidad === 'object'
                  ? wizardDraft.entidad?.nombre || ''
                  : wizardDraft.entidad || ''
              }
              onChange={(e) => handleFieldChange('entidad', e.target.value)}
              placeholder="Ej: Secretaría de Educación / Nueva EPS / Alcaldía"
              className="w-full min-h-[48px] px-3 py-2 text-sm rounded-lg border-2 border-slate-400 focus:border-brand-900 text-slate-900"
            />
          </div>
        </div>
      )}

      {/* STEP 4: Hechos */}
      {step === 4 && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <div>
            <h3 className="text-xl font-black text-slate-900">¿Qué ocurrió? (Los Hechos)</h3>
            <p className="text-xs text-slate-600 mt-1">
              Cuenta la situación en orden cronológico: fechas, motivos y lo que ha pasado.
            </p>
          </div>

          <div>
            <label htmlFor="hechos" className="block text-xs font-bold text-slate-800 uppercase mb-1">
              Descripción de los hechos *
            </label>
            <textarea
              id="hechos"
              rows={6}
              required
              value={wizardDraft.hechos || ''}
              onChange={(e) => handleFieldChange('hechos', e.target.value)}
              placeholder="Ejemplo: Desde el 15 de enero en la escuela de nuestra vereda no contamos con docente..."
              className="w-full p-3 text-sm rounded-lg border-2 border-slate-400 focus:border-brand-900 text-slate-900"
            />
          </div>
        </div>
      )}

      {/* STEP 5: Petición Concreta */}
      {step === 5 && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <div>
            <h3 className="text-xl font-black text-slate-900">¿Qué solicitas con exactitud?</h3>
            <p className="text-xs text-slate-600 mt-1">
              Define puntualmente la orden, respuesta o solución que requieres de la entidad.
            </p>
          </div>

          <div>
            <label htmlFor="peticion" className="block text-xs font-bold text-slate-800 uppercase mb-1">
              Petición concreta / Pretensión *
            </label>
            <textarea
              id="peticion"
              rows={6}
              required
              value={wizardDraft.peticion || ''}
              onChange={(e) => handleFieldChange('peticion', e.target.value)}
              placeholder="Ejemplo: Solicito se asigne y posesione de manera inmediata al docente de primaria para la sede rural..."
              className="w-full p-3 text-sm rounded-lg border-2 border-slate-400 focus:border-brand-900 text-slate-900"
            />
          </div>
        </div>
      )}

      {/* STEP 6: Resumen y Envío */}
      {step === 6 && (
        <div className="flex flex-col gap-4 animate-fadeIn">
          <div>
            <h3 className="text-xl font-black text-slate-900">Revisión y confirmación</h3>
            <p className="text-xs text-slate-600 mt-1">
              Verifica los datos antes de radicar formalmente tu documento legal.
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border-2 border-slate-300 text-xs flex flex-col gap-2.5">
            <div>
              <span className="font-bold text-slate-600 block">Mecanismo & Categoría:</span>
              <span className="font-black text-brand-950">
                {wizardDraft.mecanismo} — {wizardDraft.categoria}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-2">
              <span className="font-bold text-slate-600 block">Ciudadano solicitante:</span>
              <span className="text-slate-900 font-semibold">
                {wizardDraft.ciudadano?.nombre_completo} (Doc: {wizardDraft.ciudadano?.numero_documento}) — Tel: {wizardDraft.ciudadano?.telefono}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-2">
              <span className="font-bold text-slate-600 block">Entidad destinataria:</span>
              <span className="text-slate-900 font-semibold">
                {typeof wizardDraft.entidad === 'object'
                  ? wizardDraft.entidad?.nombre
                  : wizardDraft.entidad}
              </span>
            </div>
            <div className="border-t border-slate-200 pt-2">
              <span className="font-bold text-slate-600 block">Hechos:</span>
              <p className="text-slate-700 mt-0.5 line-clamp-3">{wizardDraft.hechos}</p>
            </div>
            <div className="border-t border-slate-200 pt-2">
              <span className="font-bold text-slate-600 block">Petición concreta:</span>
              <p className="text-slate-700 mt-0.5 line-clamp-3">{wizardDraft.peticion}</p>
            </div>
          </div>
        </div>
      )}

      {/* Sticky Bottom Actions */}
      <div className="mt-4 pt-3 border-t border-slate-200 flex gap-2">
        {step > 1 && (
          <button
            type="button"
            onClick={prevStep}
            className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl border-2 border-slate-700 text-slate-800 font-bold text-sm hover:bg-slate-50"
          >
            Atrás
          </button>
        )}

        {step < 6 ? (
          <button
            type="button"
            onClick={nextStep}
            className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl bg-brand-900 hover:bg-brand-950 text-white font-bold text-sm flex items-center justify-center gap-1.5 border-2 border-brand-950 shadow-md"
          >
            <span>Siguiente</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 min-h-[52px] px-4 py-2.5 rounded-xl bg-brand-900 hover:bg-brand-950 text-white font-bold text-sm flex items-center justify-center gap-2 border-2 border-brand-950 shadow-md disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Radicando solicitud...</span>
              </>
            ) : (
              <>
                <FileCheck2 className="w-4 h-4 text-emerald-300" />
                <span>Enviar solicitud</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};
