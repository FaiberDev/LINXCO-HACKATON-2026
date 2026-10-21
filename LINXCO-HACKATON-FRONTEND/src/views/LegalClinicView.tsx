import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCase } from '../context/CaseContext';
import { ArrowLeft, MessageSquare, CheckCircle, AlertCircle, Loader2, Copy } from 'lucide-react';

export const LegalClinicView: React.FC = () => {
  const navigate = useNavigate();
  const { saveCase } = useCase();

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [vereda, setVereda] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [autorizacion, setAutorizacion] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!autorizacion) {
      setErrorMessage('Debes autorizar el tratamiento de datos para recibir asesoría.');
      return;
    }

    if (!nombre.trim() || !telefono.trim() || !municipio.trim() || !descripcion.trim()) {
      setErrorMessage('Por favor completa los campos obligatorios marcados con (*).');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        tipo_problema: 'Consultorio Jurídico (Asesoría personalizada)',
        estado: 'BORRADOR' as const,
        formulario_web: {
          modalidad: 'consultorio_juridico',
          mecanismo: 'Asesoría jurídica',
          categoria: 'OTRO',
          ciudadano: {
            nombre_completo: nombre.trim(),
            numero_documento: '',
            telefono: telefono.trim(),
            municipio: municipio.trim(),
            vereda: vereda.trim(),
          },
          hechos: descripcion.trim(),
        },
      };

      const result = await saveCase(payload);
      setCreatedCode(result.codigo_sms);
    } catch (err: unknown) {
      setErrorMessage(
        (err as Error)?.message || 'No fue posible enviar la solicitud. Intenta nuevamente.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (createdCode) {
      navigator.clipboard?.writeText(createdCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (createdCode) {
    return (
      <div className="flex flex-col gap-6 py-6 text-center animate-fadeIn">
        <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-600 text-emerald-800 mx-auto flex items-center justify-center">
          <CheckCircle className="w-8 h-8" />
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-900">¡Solicitud recibida!</h2>
          <p className="text-sm text-slate-600 mt-2">
            Un asesor jurídico del Consultorio Jurídico se comunicará contigo al teléfono suministrado.
          </p>
        </div>

        <div className="p-4 bg-emerald-50 rounded-xl border-2 border-emerald-300 flex flex-col gap-2">
          <span className="text-xs font-bold text-brand-950 uppercase">Tu código de seguimiento</span>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-mono font-black text-brand-900 tracking-wider">
              {createdCode}
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
            onClick={() => navigate(`/estado/${encodeURIComponent(createdCode)}`)}
            className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-brand-900 text-white font-bold text-sm border-2 border-brand-950"
          >
            Ver estado de mi trámite
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
          Habla con un asesor
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Recibe asesoría personalizada del equipo del Consultorio Jurídico para tu comunidad rural.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {errorMessage && (
          <div
            role="alert"
            className="p-3 bg-red-50 border-2 border-red-300 rounded-lg text-xs text-red-800 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Nombre completo */}
        <div>
          <label htmlFor="nombre" className="block text-xs font-bold text-slate-800 uppercase mb-1">
            Nombre completo *
          </label>
          <input
            id="nombre"
            type="text"
            required
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Ej: María Rodríguez"
            className="w-full min-h-[48px] px-3 py-2 text-sm rounded-lg border-2 border-slate-400 focus:border-brand-900 text-slate-900"
          />
        </div>

        {/* Teléfono de contacto */}
        <div>
          <label htmlFor="telefono" className="block text-xs font-bold text-slate-800 uppercase mb-1">
            Teléfono de contacto / WhatsApp *
          </label>
          <input
            id="telefono"
            type="tel"
            required
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Ej: 3101234567"
            className="w-full min-h-[48px] px-3 py-2 text-sm rounded-lg border-2 border-slate-400 focus:border-brand-900 text-slate-900"
          />
        </div>

        {/* Municipio */}
        <div>
          <label htmlFor="municipio" className="block text-xs font-bold text-slate-800 uppercase mb-1">
            Municipio *
          </label>
          <input
            id="municipio"
            type="text"
            required
            value={municipio}
            onChange={(e) => setMunicipio(e.target.value)}
            placeholder="Ej: Santander de Quilichao"
            className="w-full min-h-[48px] px-3 py-2 text-sm rounded-lg border-2 border-slate-400 focus:border-brand-900 text-slate-900"
          />
        </div>

        {/* Vereda */}
        <div>
          <label htmlFor="vereda" className="block text-xs font-bold text-slate-800 uppercase mb-1">
            Vereda o sector
          </label>
          <input
            id="vereda"
            type="text"
            value={vereda}
            onChange={(e) => setVereda(e.target.value)}
            placeholder="Ej: Vereda San Antonio"
            className="w-full min-h-[48px] px-3 py-2 text-sm rounded-lg border-2 border-slate-400 focus:border-brand-900 text-slate-900"
          />
        </div>

        {/* Descripción del problema */}
        <div>
          <label htmlFor="descripcion" className="block text-xs font-bold text-slate-800 uppercase mb-1">
            Describe brevemente tu problema legal *
          </label>
          <textarea
            id="descripcion"
            required
            rows={4}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Cuéntanos qué sucedió y qué apoyo requieres..."
            className="w-full p-3 text-sm rounded-lg border-2 border-slate-400 focus:border-brand-900 text-slate-900"
          />
        </div>

        {/* Autorización de datos */}
        <div className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-300 rounded-lg">
          <input
            id="autorizacion"
            type="checkbox"
            checked={autorizacion}
            onChange={(e) => setAutorizacion(e.target.checked)}
            className="mt-1 w-5 h-5 rounded border-2 border-slate-600 text-brand-900 focus:ring-brand-900 cursor-pointer"
          />
          <label htmlFor="autorizacion" className="text-xs text-slate-700 leading-snug cursor-pointer">
            Autorizo el tratamiento de mis datos personales para ser contactado por los abogados del
            Consultorio Jurídico con fines exclusivos de orientación jurídica gratuita. *
          </label>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full min-h-[52px] mt-2 px-4 py-3 rounded-xl bg-brand-900 hover:bg-brand-950 text-white font-bold text-base flex items-center justify-center gap-2 border-2 border-brand-950 shadow-md disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Enviando solicitud...</span>
            </>
          ) : (
            <>
              <MessageSquare className="w-5 h-5 text-emerald-300" />
              <span>Solicitar asesoría</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
