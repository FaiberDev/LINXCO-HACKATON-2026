import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCase } from '../context/CaseContext';
import { MunicipalityAutocomplete } from '../components/forms/MunicipalityAutocomplete';
import {
  ArrowLeft,
  ChatsTeardrop,
  CheckCircle,
  WarningCircle,
  SpinnerGap,
  Copy,
  User,
  PhoneCall,
  MapPin,
  Scales,
} from '@phosphor-icons/react';

import atardecerRioImg from '../assets/images/atardecer-rio-sm.webp';

export const LegalClinicView: React.FC = () => {
  const navigate = useNavigate();
  const { saveCase } = useCase();

  const [nombres, setNombres] = useState('');
  const [apellidos, setApellidos] = useState('');
  const [telefono, setTelefono] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [departamento, setDepartamento] = useState('');
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

    const nombreCompletoCombinado = [nombres.trim(), apellidos.trim()]
      .filter(Boolean)
      .join(' ')
      .trim();

    if (
      !nombreCompletoCombinado ||
      !telefono.trim() ||
      !municipio.trim() ||
      !descripcion.trim()
    ) {
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
            nombres: nombres.trim(),
            apellidos: apellidos.trim(),
            nombre_completo: nombreCompletoCombinado,
            numero_documento: '',
            telefono: telefono.trim(),
            departamento: departamento.trim() || undefined,
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
      <div className="flex flex-col gap-6 py-8 text-center max-w-xl mx-auto animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-olive-100 border-2 border-olive-600 text-olive-800 mx-auto flex items-center justify-center shadow-sm">
          <CheckCircle weight="duotone" className="w-9 h-9" />
        </div>

        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-charcoal-950 font-editorial">
            ¡Solicitud recibida!
          </h2>
          <p className="text-sm text-charcoal-700 mt-2">
            Un asesor jurídico del Consultorio Jurídico se comunicará contigo al teléfono suministrado.
          </p>
        </div>

        <div className="p-5 bg-olive-50 rounded-2xl border-2 border-olive-400 flex flex-col gap-2">
          <span className="text-xs font-bold text-charcoal-900 uppercase tracking-wider">
            Tu código de seguimiento
          </span>
          <div className="flex items-center justify-center gap-2">
            <span className="text-2xl font-mono font-black text-institucional-700 tracking-wider">
              {createdCode}
            </span>
            <button
              type="button"
              onClick={handleCopyCode}
              aria-label="Copiar código al portapapeles"
              className="p-2.5 rounded-xl bg-white border-2 border-olive-400 text-charcoal-900 hover:bg-olive-100 transition"
            >
              <Copy weight="duotone" className="w-4 h-4" />
            </button>
          </div>
          {copied && <span className="text-xs text-olive-800 font-bold">¡Código copiado!</span>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
          <button
            type="button"
            onClick={() => navigate(`/estado/${encodeURIComponent(createdCode)}`)}
            className="w-full min-h-[50px] px-4 py-3 rounded-xl bg-institucional-500 hover:bg-institucional-600 text-white font-bold text-sm border-2 border-charcoal-950 transition"
          >
            Ver estado de mi trámite
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full min-h-[50px] px-4 py-3 rounded-xl bg-white hover:bg-charcoal-50 text-charcoal-900 font-bold text-sm border-2 border-charcoal-800 transition"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

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

      {/* Hero Banner */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-charcoal-900 p-6 sm:p-8 text-white shadow-md">
        <img
          src={atardecerRioImg}
          alt="Comunidad ribereña y rural de Colombia"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-charcoal-950/95 via-charcoal-900/85 to-institucional-950/80"
        />
        <div className="relative z-10 max-w-2xl space-y-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-aqua-400 text-charcoal-950">
            <Scales weight="duotone" className="w-3.5 h-3.5" />
            <span>Atención Jurídica Gratuita</span>
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight font-editorial">
            Habla con un asesor
          </h2>
          <p className="text-xs sm:text-sm text-olive-100 leading-relaxed">
            Recibe asesoría personalizada del equipo del Consultorio Jurídico para tu comunidad rural.
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-6 sm:p-8 rounded-3xl bg-white border-2 border-charcoal-800 shadow-sm flex flex-col gap-5"
      >
        {errorMessage && (
          <div
            role="alert"
            className="p-3.5 bg-red-50 border-2 border-red-400 rounded-xl text-xs font-bold text-red-900 flex items-start gap-2.5"
          >
            <WarningCircle weight="duotone" className="w-5 h-5 text-red-700 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Campos de Nombre separados en Grid de 2 Columnas en Escritorio */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="nombre"
              className="block text-xs font-bold text-charcoal-900 uppercase tracking-wider mb-1.5"
            >
              Nombre(s) * <span className="sr-only">Nombre completo *</span>
            </label>
            <div className="relative">
              <User
                weight="duotone"
                className="w-5 h-5 text-institucional-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <input
                id="nombre"
                type="text"
                required
                value={nombres}
                onChange={(e) => setNombres(e.target.value)}
                placeholder="Ej: María Fernanda"
                className="w-full min-h-[48px] pl-10 pr-3.5 py-2.5 text-sm font-medium rounded-xl border-2 border-charcoal-300 focus:border-institucional-500 text-charcoal-950"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="apellidos"
              className="block text-xs font-bold text-charcoal-900 uppercase tracking-wider mb-1.5"
            >
              Apellido(s) *
            </label>
            <div className="relative">
              <User
                weight="duotone"
                className="w-5 h-5 text-olive-700 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <input
                id="apellidos"
                type="text"
                value={apellidos}
                onChange={(e) => setApellidos(e.target.value)}
                placeholder="Ej: Rodríguez Gómez"
                className="w-full min-h-[48px] pl-10 pr-3.5 py-2.5 text-sm font-medium rounded-xl border-2 border-charcoal-300 focus:border-institucional-500 text-charcoal-950"
              />
            </div>
          </div>
        </div>

        {/* Teléfono y Municipio con Autocompletado en Grid de 2 Columnas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="telefono"
              className="block text-xs font-bold text-charcoal-900 uppercase tracking-wider mb-1.5"
            >
              Teléfono de contacto / WhatsApp *
            </label>
            <div className="relative">
              <PhoneCall
                weight="duotone"
                className="w-5 h-5 text-institucional-600 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
              />
              <input
                id="telefono"
                type="tel"
                required
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: 3101234567"
                className="w-full min-h-[48px] pl-10 pr-3.5 py-2.5 text-sm font-medium rounded-xl border-2 border-charcoal-300 focus:border-institucional-500 text-charcoal-950"
              />
            </div>
          </div>

          {/* Selector de Municipio con Autocompletado DANE */}
          <MunicipalityAutocomplete
            id="municipio"
            label="Municipio *"
            required
            value={municipio}
            onChange={(val, item) => {
              setMunicipio(val);
              if (item) {
                setDepartamento(item.departamento);
              }
            }}
            placeholder="Ej: Santander de Quilichao o escribe VA..."
          />
        </div>

        {/* Vereda */}
        <div>
          <label
            htmlFor="vereda"
            className="block text-xs font-bold text-charcoal-900 uppercase tracking-wider mb-1.5"
          >
            Vereda o sector
          </label>
          <div className="relative">
            <MapPin
              weight="duotone"
              className="w-5 h-5 text-olive-700 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            />
            <input
              id="vereda"
              type="text"
              value={vereda}
              onChange={(e) => setVereda(e.target.value)}
              placeholder="Ej: Vereda San Antonio, Corregimiento El Palmar"
              className="w-full min-h-[48px] pl-10 pr-3.5 py-2.5 text-sm font-medium rounded-xl border-2 border-charcoal-300 focus:border-institucional-500 text-charcoal-950"
            />
          </div>
        </div>

        {/* Descripción del problema */}
        <div>
          <label
            htmlFor="descripcion"
            className="block text-xs font-bold text-charcoal-900 uppercase tracking-wider mb-1.5"
          >
            Describe brevemente tu problema legal *
          </label>
          <textarea
            id="descripcion"
            required
            rows={4}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Cuéntanos qué sucedió y qué apoyo requieres..."
            className="w-full p-3.5 text-sm font-medium rounded-xl border-2 border-charcoal-300 focus:border-institucional-500 text-charcoal-950"
          />
        </div>

        {/* Autorización de datos */}
        <div className="flex items-start gap-3 p-4 bg-olive-50 border border-olive-300 rounded-xl">
          <input
            id="autorizacion"
            type="checkbox"
            checked={autorizacion}
            onChange={(e) => setAutorizacion(e.target.checked)}
            className="mt-0.5 w-5 h-5 rounded border-2 border-charcoal-600 text-institucional-600 focus:ring-institucional-500 cursor-pointer"
          />
          <label htmlFor="autorizacion" className="text-xs text-charcoal-800 leading-snug cursor-pointer font-medium">
            Autorizo el tratamiento de mis datos personales para ser contactado por los abogados del
            Consultorio Jurídico con fines exclusivos de orientación jurídica gratuita. *
          </label>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full min-h-[54px] mt-1 px-5 py-3.5 rounded-xl bg-institucional-500 hover:bg-institucional-600 text-white font-black text-base flex items-center justify-center gap-2 border-2 border-charcoal-950 shadow-md disabled:opacity-50 transition"
        >
          {isSubmitting ? (
            <>
              <SpinnerGap weight="bold" className="w-5 h-5 animate-spin" />
              <span>Enviando solicitud...</span>
            </>
          ) : (
            <>
              <ChatsTeardrop weight="duotone" className="w-5 h-5 text-aqua-300" />
              <span>Solicitar asesoría</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};
