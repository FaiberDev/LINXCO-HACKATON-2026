import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Sparkle,
  Smiley,
  VideoCamera,
  PlayCircle,
  BookOpenText,
  ShieldCheck,
  Scales,
  GraduationCap,
  Heart,
  ArrowSquareOut,
  CheckCircle,
} from '@phosphor-icons/react';

import puebloAndinoImg from '../assets/images/pueblo-andino-sm.webp';

interface KidsVideo {
  id: string;
  youtubeId: string;
  titulo: string;
  subtitulo: string;
  descripcion: string;
  puntosClave: string[];
  duracionSugerida: string;
  urlOriginal: string;
  colorTema: string;
  icono: 'book' | 'scales' | 'shield';
}

export const KIDS_VIDEOS: KidsVideo[] = [
  {
    id: 'video-1',
    youtubeId: '3X4qwBv53iQ',
    titulo: '¿Qué son los derechos y deberes?',
    subtitulo: 'Aprende a reconocer tus garantías y tus responsabilidades diarias',
    descripcion:
      'Desde el día en que nacemos, todas las niñas y niños tenemos derechos sagrados: el derecho a la vida, a tener un nombre, a jugar, a ir a la escuela y a recibir atención médica cuando nos enfermamos. Pero también tenemos deberes: respetar a nuestros padres, cuidar a nuestros compañeros y ayudar a mantener limpio nuestro entorno.',
    puntosClave: [
      'Los derechos te cuidan y nadie te los puede quitar.',
      'Los deberes nos ayudan a convivir en paz y armonía en la escuela y en la vereda.',
      'Cuando respetas los derechos de los demás, proteges también los tuyos.',
    ],
    duracionSugerida: 'Educativo y Animado',
    urlOriginal: 'https://youtu.be/3X4qwBv53iQ?feature=shared',
    colorTema: 'emerald',
    icono: 'book',
  },
  {
    id: 'video-2',
    youtubeId: 'GnBENCxOKtQ',
    titulo: '¿Qué es la constitución política?',
    subtitulo: 'El libro más importante de Colombia explicado para niñas y niños',
    descripcion:
      'Imagina que Colombia es un gran juego y la Constitución Política de 1991 es el libro con las reglas de oro para que todos juguemos limpio, nadie sufra abusos y todos seamos tratados con igualdad y dignidad. En la Constitución dice con letras grandes que los derechos de los niños prevalecen sobre todos los demás.',
    puntosClave: [
      'Es la norma suprema de Colombia: ninguna otra regla puede ir en su contra.',
      'El Artículo 44 declara que los derechos de los niños son prioritarios y fundamentales.',
      'Organiza cómo el Estado y los jueces deben cuidar a las comunidades rurales y campesinas.',
    ],
    duracionSugerida: 'Historia y Ciudadanía',
    urlOriginal: 'https://youtu.be/GnBENCxOKtQ?si=CrAJfz9g_wgDSGmX',
    colorTema: 'amber',
    icono: 'scales',
  },
  {
    id: 'video-3',
    youtubeId: 'i7utTqN5SB8',
    titulo: '¿Cómo protejo mis derechos?',
    subtitulo: 'Tus superpoderes legales: la Tutela, el Derecho de Petición y las autoridades',
    descripcion:
      '¿Qué pasa si en tu vereda no hay profesor, la EPS no le da la medicina a tu abuelita o te niegan el transporte escolar? No tienes que quedarte de brazos cruzados: la Constitución te da herramientas como la Acción de Tutela y el Derecho de Petición para que un juez o la alcaldía resuelvan el problema de inmediato.',
    puntosClave: [
      'No necesitas dinero ni ser mayor de edad para pedir que te cuiden.',
      'La Acción de Tutela obliga a las entidades a responder en máximo 10 días.',
      'Los personeros, defensores del pueblo y consultorios jurídicos están para respaldarte.',
    ],
    duracionSugerida: 'Acción y Soluciones',
    urlOriginal: 'https://youtu.be/i7utTqN5SB8?si=0afWna2NrhPzNlzs',
    colorTema: 'sky',
    icono: 'shield',
  },
];

export const KidsRightsView: React.FC = () => {
  const navigate = useNavigate();
  const [activeVideoId, setActiveVideoId] = useState<string>('video-1');

  const activeVideo =
    KIDS_VIDEOS.find((v) => v.id === activeVideoId) || KIDS_VIDEOS[0];

  return (
    <div className="flex flex-col gap-8 py-6 max-w-5xl mx-auto">
      {/* Botón de retroceso */}
      <div>
        <button
          type="button"
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-charcoal-800 hover:text-institucional-600 py-2 px-3.5 rounded-xl hover:bg-olive-100 transition"
        >
          <ArrowLeft weight="bold" className="w-4 h-4" />
          Volver al inicio
        </button>
      </div>

      {/* Hero Header Amigable e Infantil */}
      <div className="relative rounded-3xl overflow-hidden border-2 border-charcoal-900 p-6 sm:p-10 text-white shadow-md">
        <img
          src={puebloAndinoImg}
          alt="Paisaje andino colombiano"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-r from-charcoal-950/95 via-charcoal-900/85 to-institucional-950/80"
        />
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-400 text-charcoal-950 border border-charcoal-900 shadow-sm">
              <Smiley weight="fill" className="w-4 h-4 text-charcoal-900" />
              <span>Espacio para Niñas, Niños y Jóvenes</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white backdrop-blur-sm">
              <Sparkle weight="duotone" className="w-3.5 h-3.5 text-aqua-300" />
              <span>Semillero de Justicia en tu Vereda</span>
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight font-editorial">
            Aprende tus Derechos con Videos
          </h1>
          <p className="text-xs sm:text-sm text-olive-100 leading-relaxed max-w-xl">
            ¡Descubre de forma entretenida y visual qué son los derechos humanos, cómo funciona la Constitución de Colombia y qué puedes hacer cuando necesites protección!
          </p>

          <div className="pt-2 flex flex-wrap gap-3">
            <a
              href="#videos-grid"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-institucional-500 hover:bg-institucional-600 text-white font-black text-xs border border-charcoal-900 shadow-sm transition"
            >
              <PlayCircle weight="bold" className="w-4 h-4" />
              <span>Ver los 3 Videos Educativos</span>
            </a>
            <button
              type="button"
              onClick={() => navigate('/aprender')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-olive-50 text-charcoal-900 font-bold text-xs border border-charcoal-300 shadow-sm transition"
            >
              <BookOpenText weight="duotone" className="w-4 h-4" />
              <span>Ver Guía para Adultos</span>
            </button>
          </div>
        </div>
      </div>

      {/* Selector Rápido de Videos (Píldoras interactivas) */}
      <div id="videos-grid" className="space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-charcoal-950 font-editorial">
              Elige un video para aprender:
            </h2>
            <p className="text-xs text-charcoal-700">
              Haz clic en cualquiera de los temas para cargarlo directamente en el reproductor.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-charcoal-600 bg-olive-100 px-3 py-1 rounded-lg border border-olive-300">
            3 episodios pedagógicos
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {KIDS_VIDEOS.map((video, idx) => {
            const isSelected = video.id === activeVideoId;
            return (
              <button
                key={video.id}
                type="button"
                onClick={() => setActiveVideoId(video.id)}
                className={`p-4 rounded-2xl border-2 text-left transition flex flex-col justify-between gap-3 ${
                  isSelected
                    ? 'bg-institucional-900 text-white border-charcoal-950 shadow-md ring-2 ring-institucional-500'
                    : 'bg-white hover:bg-olive-50 text-charcoal-900 border-charcoal-800 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md font-mono ${
                      isSelected
                        ? 'bg-amber-400 text-charcoal-950'
                        : 'bg-olive-100 text-charcoal-700 border border-olive-300'
                    }`}
                  >
                    Video #{idx + 1}
                  </span>
                  <PlayCircle
                    weight={isSelected ? 'fill' : 'duotone'}
                    className={`w-6 h-6 shrink-0 ${
                      isSelected ? 'text-aqua-300' : 'text-institucional-600'
                    }`}
                  />
                </div>

                <div>
                  <h3 className="font-black text-sm sm:text-base leading-snug font-editorial">
                    {video.titulo}
                  </h3>
                  <p
                    className={`text-xs mt-1 line-clamp-2 ${
                      isSelected ? 'text-olive-100' : 'text-charcoal-600'
                    }`}
                  >
                    {video.subtitulo}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Reproductor Principal con Estética Institucional Rural */}
      <section className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-charcoal-900 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-olive-100 pb-4">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-institucional-700 mb-1">
              <VideoCamera weight="duotone" className="w-4 h-4" />
              <span>Reproduciendo ahora</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-charcoal-950 font-editorial">
              {activeVideo.titulo}
            </h2>
            <p className="text-xs sm:text-sm text-charcoal-700 mt-0.5">
              {activeVideo.subtitulo}
            </p>
          </div>

          <a
            href={activeVideo.urlOriginal}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-charcoal-100 hover:bg-charcoal-200 text-charcoal-900 text-xs font-bold border border-charcoal-400 transition self-start sm:self-auto shrink-0"
            title="Abrir este video directamente en YouTube"
          >
            <span>Ver en YouTube</span>
            <ArrowSquareOut weight="bold" className="w-4 h-4 text-charcoal-700" />
          </a>
        </div>

        {/* Contenedor Iframe 16:9 Adaptativo */}
        <div className="relative aspect-video w-full rounded-2xl overflow-hidden border-2 border-charcoal-950 shadow-inner bg-charcoal-950">
          <iframe
            key={activeVideo.youtubeId}
            src={`https://www.youtube-nocookie.com/embed/${activeVideo.youtubeId}?rel=0&modestbranding=1`}
            title={activeVideo.titulo}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>

        {/* Explicación y Puntos Clave para Aprender */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          {/* Columna Izquierda: Explicación narrativa */}
          <div className="lg:col-span-2 space-y-3">
            <h3 className="text-base font-black text-charcoal-900 uppercase tracking-wide flex items-center gap-2">
              <BookOpenText weight="duotone" className="w-5 h-5 text-institucional-600" />
              <span>¿De qué trata este video?</span>
            </h3>
            <p className="text-xs sm:text-sm text-charcoal-800 leading-relaxed font-medium">
              {activeVideo.descripcion}
            </p>

            <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-300 text-amber-950 flex items-start gap-3 mt-4">
              <GraduationCap weight="duotone" className="w-6 h-6 text-amber-800 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <span className="font-black text-amber-950 uppercase tracking-wider block">
                  Para compartir en la escuela o en casa:
                </span>
                <p className="text-amber-900 leading-relaxed">
                  Profesores, padres y madres de familia pueden usar estos videos en talleres rurales para promover el liderazgo y la sana convivencia desde temprana edad.
                </p>
              </div>
            </div>
          </div>

          {/* Columna Derecha: Puntos Clave */}
          <div className="p-5 rounded-2xl bg-olive-50 border-2 border-olive-300 space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-charcoal-950 flex items-center gap-1.5">
              <CheckCircle weight="fill" className="w-4 h-4 text-olive-700" />
              <span>Ideas principales:</span>
            </h4>
            <ul className="space-y-2.5">
              {activeVideo.puntosClave.map((punto, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-charcoal-800">
                  <span className="w-4 h-4 rounded-full bg-olive-200 text-olive-900 font-bold font-mono text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-snug">{punto}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Los 3 Videos en formato de Lista / Galería Completa */}
      <section className="space-y-6">
        <div className="border-b-2 border-olive-200 pb-3">
          <h2 className="text-xl sm:text-2xl font-black text-charcoal-950 font-editorial">
            Catálogo Completo de Videos Educativos
          </h2>
          <p className="text-xs text-charcoal-700">
            Disfruta de cada capítulo a tu propio ritmo.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {KIDS_VIDEOS.map((v, index) => (
            <article
              key={v.id}
              className="bg-white rounded-3xl border-2 border-charcoal-800 overflow-hidden shadow-sm flex flex-col justify-between"
            >
              <div className="p-4 bg-olive-100 border-b-2 border-charcoal-800 flex items-center justify-between">
                <span className="text-xs font-black text-charcoal-950 font-mono">
                  Capítulo #{index + 1}
                </span>
                <span className="text-[11px] font-bold text-institucional-800 bg-white px-2.5 py-0.5 rounded-full border border-olive-300">
                  Constitución Infantil
                </span>
              </div>

              <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-2">
                  <h3 className="font-black text-base text-charcoal-950 font-editorial leading-snug">
                    {v.titulo}
                  </h3>
                  <p className="text-xs text-charcoal-700 line-clamp-3 leading-relaxed">
                    {v.descripcion}
                  </p>
                </div>

                <div className="pt-3 border-t border-olive-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveVideoId(v.id);
                      window.scrollTo({ top: 300, behavior: 'smooth' });
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-institucional-500 hover:bg-institucional-600 text-white font-bold text-xs transition"
                  >
                    <PlayCircle weight="bold" className="w-4 h-4" />
                    <span>Reproducir arriba</span>
                  </button>

                  <a
                    href={v.urlOriginal}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-xl text-charcoal-600 hover:text-charcoal-950 hover:bg-olive-100 transition"
                    title="Abrir en YouTube"
                  >
                    <ArrowSquareOut weight="bold" className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Banner de Invitación a la Comunidad Educativa */}
      <div className="p-6 sm:p-8 rounded-3xl bg-institucional-900 text-white border-2 border-charcoal-950 shadow-md flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-400 text-charcoal-950 flex items-center justify-center shrink-0 border border-charcoal-950 shadow-sm">
            <Heart weight="fill" className="w-8 h-8 text-rose-600" />
          </div>
          <div className="space-y-1 text-left">
            <h3 className="text-lg sm:text-xl font-black font-editorial">
              ¿Tienes una duda o necesitas ayuda para tu escuela?
            </h3>
            <p className="text-xs sm:text-sm text-olive-100 max-w-lg">
              Los asesores jurídicos de la Universidad de Antioquia pueden orientar a tu familia o a los docentes de tu vereda sin costo alguno.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => navigate('/portal')}
          className="min-h-[50px] px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-charcoal-950 font-black text-xs sm:text-sm border-2 border-charcoal-950 shadow-sm transition shrink-0 active:scale-95"
        >
          <span>Iniciar Solicitud Ciudadana</span>
        </button>
      </div>
    </div>
  );
};
