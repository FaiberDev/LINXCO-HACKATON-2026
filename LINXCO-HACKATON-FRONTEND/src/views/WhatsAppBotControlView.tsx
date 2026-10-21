import React, { useState, useEffect } from 'react';
import { apiFetch } from '../services/api';
import {
  WhatsappLogo,
  Power,
  QrCode,
  CheckCircle,
  XCircle,
  ArrowsClockwise,
  SpinnerGap,
  DeviceMobile,
  ChatsCircle,
} from '@phosphor-icons/react';

interface BotStatus {
  status: 'STOPPED' | 'CONNECTING' | 'WAITING_QR' | 'CONNECTED';
  isConnected: boolean;
  isWaitingQr: boolean;
  isConnecting: boolean;
  isStopped: boolean;
  qrCode?: string | null;
  qrDataUrl?: string | null;
  phoneNumber?: string | null;
  sessionExists?: boolean;
  startedAt?: string | null;
  processedMessages?: number;
  lastError?: string | null;
  logs?: Array<{
    timestamp: string;
    timeFormatted: string;
    type: string;
    text: string;
  }>;
}

export const WhatsAppBotControlView: React.FC = () => {
  const [botData, setBotData] = useState<BotStatus | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = async () => {
    try {
      const data = await apiFetch<BotStatus & { success: boolean }>('/bot/status');
      setBotData(data);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Error al conectar con la API del bot');
    }
  };

  useEffect(() => {
    fetchStatus();
    // Sondeo periódico cada 3 segundos para refrescar el QR y estado de conexión automáticamente
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    setActionLoading('start');
    try {
      await apiFetch('/bot/start', { method: 'POST' });
      await fetchStatus();
    } catch (err: any) {
      setError(err?.message || 'Error al iniciar bot');
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async () => {
    setActionLoading('stop');
    try {
      await apiFetch('/bot/stop', { method: 'POST' });
      await fetchStatus();
    } catch (err: any) {
      setError(err?.message || 'Error al detener bot');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm('¿Deseas cerrar la sesión y generar un nuevo código QR?')) return;
    setActionLoading('logout');
    try {
      await apiFetch('/bot/logout', { method: 'POST' });
      await fetchStatus();
    } catch (err: any) {
      setError(err?.message || 'Error al cerrar sesión de WhatsApp');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReset = async () => {
    setActionLoading('reset');
    try {
      await apiFetch('/bot/reset', { method: 'POST' });
      await fetchStatus();
    } catch (err: any) {
      setError(err?.message || 'Error al reiniciar sesión de WhatsApp');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Encabezado */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-charcoal-900 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 border-2 border-emerald-600 flex items-center justify-center text-emerald-700 shrink-0">
            <WhatsappLogo weight="duotone" className="w-9 h-9" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-charcoal-950 font-editorial">
              Control del Bot de WhatsApp
            </h1>
            <p className="text-xs sm:text-sm text-charcoal-700">
              Enciende, apaga y vincula el asistente de WhatsApp para responder a la comunidad rural.
            </p>
          </div>
        </div>

        {/* Estado badge */}
        <div className="flex items-center gap-2">
          {botData?.isConnected ? (
            <span className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-black text-xs inline-flex items-center gap-2 border-2 border-charcoal-950 shadow-sm">
              <CheckCircle weight="fill" className="w-4 h-4" />
              <span>BOT ENCENDIDO Y ACTIVO</span>
            </span>
          ) : botData?.isWaitingQr ? (
            <span className="px-4 py-2 rounded-xl bg-amber-400 text-charcoal-950 font-black text-xs inline-flex items-center gap-2 border-2 border-charcoal-950 shadow-sm animate-pulse">
              <QrCode weight="bold" className="w-4 h-4" />
              <span>ESPERANDO ESCANEO DE QR</span>
            </span>
          ) : botData?.isConnecting ? (
            <span className="px-4 py-2 rounded-xl bg-sky-400 text-charcoal-950 font-black text-xs inline-flex items-center gap-2 border-2 border-charcoal-950 shadow-sm">
              <SpinnerGap weight="bold" className="w-4 h-4 animate-spin" />
              <span>CONECTANDO...</span>
            </span>
          ) : (
            <span className="px-4 py-2 rounded-xl bg-charcoal-200 text-charcoal-800 font-black text-xs inline-flex items-center gap-2 border-2 border-charcoal-400">
              <XCircle weight="fill" className="w-4 h-4 text-charcoal-500" />
              <span>BOT APAGADO</span>
            </span>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-900 text-xs font-bold flex items-center justify-between">
          <span>{error}</span>
          <button onClick={fetchStatus} className="underline text-rose-800">Reintentar</button>
        </div>
      )}

      {/* Botones de Control Principal */}
      <div className="bg-white p-6 rounded-3xl border-2 border-charcoal-800 shadow-sm space-y-4">
        <h2 className="text-base font-black text-charcoal-900 uppercase tracking-wider">
          Interruptor y Operaciones del Bot:
        </h2>

        <div className="flex flex-wrap gap-3">
          {botData?.isConnected || botData?.isWaitingQr || botData?.isConnecting ? (
            <button
              type="button"
              disabled={!!actionLoading}
              onClick={handleStop}
              className="min-h-[50px] px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-sm inline-flex items-center gap-2.5 border-2 border-charcoal-950 shadow-md active:scale-95 transition disabled:opacity-50"
            >
              {actionLoading === 'stop' ? (
                <SpinnerGap weight="bold" className="w-5 h-5 animate-spin" />
              ) : (
                <Power weight="bold" className="w-5 h-5" />
              )}
              <span>Apagar Bot de WhatsApp</span>
            </button>
          ) : (
            <button
              type="button"
              disabled={!!actionLoading}
              onClick={handleStart}
              className="min-h-[50px] px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm inline-flex items-center gap-2.5 border-2 border-charcoal-950 shadow-md active:scale-95 transition disabled:opacity-50"
            >
              {actionLoading === 'start' ? (
                <SpinnerGap weight="bold" className="w-5 h-5 animate-spin" />
              ) : (
                <Power weight="bold" className="w-5 h-5" />
              )}
              <span>Encender Bot de WhatsApp</span>
            </button>
          )}

          <button
            type="button"
            disabled={!!actionLoading}
            onClick={handleReset}
            className="min-h-[50px] px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-charcoal-950 font-black text-xs inline-flex items-center gap-2 border-2 border-charcoal-950 shadow-sm active:scale-95 transition disabled:opacity-50"
            title="Borra credenciales residuales y genera un nuevo código QR limpio"
          >
            {actionLoading === 'reset' ? (
              <SpinnerGap weight="bold" className="w-4 h-4 animate-spin" />
            ) : (
              <QrCode weight="bold" className="w-4 h-4" />
            )}
            <span>Pedir Nuevo QR (Limpiar)</span>
          </button>

          <button
            type="button"
            disabled={!!actionLoading}
            onClick={fetchStatus}
            className="min-h-[50px] px-4 py-2.5 rounded-xl bg-white hover:bg-charcoal-100 text-charcoal-900 font-bold text-sm inline-flex items-center gap-2 border-2 border-charcoal-700 transition"
          >
            <ArrowsClockwise weight="bold" className="w-4 h-4" />
            <span>Refrescar Estado</span>
          </button>
        </div>
      </div>

      {/* Panel Central: Código QR o Estado Conectado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lado Izquierdo: QR o Conexión Activa */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border-2 border-charcoal-800 shadow-sm flex flex-col items-center justify-center text-center min-h-[380px]">
          {botData?.isConnected ? (
            <div className="space-y-4 max-w-sm">
              <div className="w-20 h-20 mx-auto rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center text-emerald-600 shadow-sm">
                <CheckCircle weight="duotone" className="w-12 h-12" />
              </div>
              <h3 className="text-xl font-black text-charcoal-950 font-editorial">
                ¡WhatsApp Vinculado con Éxito!
              </h3>
              <p className="text-xs text-charcoal-700">
                El bot está escuchando mensajes y responderá automáticamente las consultas legales y generará documentos .docx.
              </p>
              {botData.phoneNumber && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-300 font-mono font-bold text-emerald-950 text-sm">
                  Número: {botData.phoneNumber}
                </div>
              )}
            </div>
          ) : botData?.qrDataUrl ? (
            <div className="space-y-3">
              <div className="p-3 bg-white border-4 border-charcoal-900 rounded-2xl shadow-lg inline-block">
                <img
                  src={botData.qrDataUrl}
                  alt="Código QR WhatsApp"
                  className="w-64 h-64 mx-auto object-contain"
                />
              </div>
              <div className="text-xs text-charcoal-800 space-y-1">
                <p className="font-black text-charcoal-950">
                  📲 Escanea este código desde WhatsApp en tu celular:
                </p>
                <p className="text-[11px] text-charcoal-600">
                  1. Abre WhatsApp &gt; Dispositivos vinculados &gt; Vincular un dispositivo<br />
                  2. Apunta la cámara directamente hacia este código QR.
                </p>
              </div>
              <button
                type="button"
                onClick={handleReset}
                disabled={!!actionLoading}
                className="text-xs font-bold text-institucional-700 hover:underline inline-flex items-center gap-1 mt-1"
              >
                <ArrowsClockwise className="w-3.5 h-3.5" />
                <span>¿No conecta o expiró? Clic aquí para generar nuevo QR limpio</span>
              </button>
            </div>
          ) : botData?.isConnecting || botData?.isWaitingQr ? (
            <div className="space-y-3">
              <SpinnerGap weight="bold" className="w-12 h-12 text-institucional-600 animate-spin mx-auto" />
              <h3 className="text-lg font-bold text-charcoal-900">Generando código QR...</h3>
              <p className="text-xs text-charcoal-600">Conectando con WhatsApp y preparando el recuadro de vinculación...</p>
            </div>
          ) : (
            <div className="space-y-4 max-w-sm text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-charcoal-100 border-2 border-charcoal-300 flex items-center justify-center text-charcoal-500">
                <Power weight="duotone" className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-black text-charcoal-900">El Bot de WhatsApp está apagado</h3>
              <p className="text-xs text-charcoal-600">
                Haz clic en <strong>"Encender Bot de WhatsApp"</strong> arriba para generar el código QR o reactivar la sesión guardada.
              </p>
            </div>
          )}
        </div>

        {/* Lado Derecho: Direcciones IP y URLs de prueba */}
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-3xl border-2 border-charcoal-800 shadow-sm space-y-3">
            <h3 className="text-sm font-black text-charcoal-950 uppercase tracking-wider flex items-center gap-2">
              <DeviceMobile weight="duotone" className="w-5 h-5 text-institucional-600" />
              <span>Direcciones IP y Acceso Móvil</span>
            </h3>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 rounded-xl bg-charcoal-50 border border-charcoal-200">
                <span className="block font-bold text-charcoal-600">IP Pública de la Instancia EC2:</span>
                <span className="font-mono font-black text-charcoal-950 text-sm">18.234.219.58</span>
              </div>

              <div className="p-3 rounded-xl bg-charcoal-50 border border-charcoal-200">
                <span className="block font-bold text-charcoal-600">IP Privada EC2 (VPC Subnet):</span>
                <span className="font-mono font-black text-charcoal-950 text-sm">172.31.28.56</span>
              </div>

              <div className="p-3 rounded-xl bg-olive-50 border border-olive-300">
                <span className="block font-bold text-olive-900">URL para abrir esta página desde tu celular:</span>
                <a
                  href="http://18.234.219.58/bot"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono font-black text-institucional-800 underline text-sm break-all"
                >
                  http://18.234.219.58/bot
                </a>
              </div>

              <div className="p-3 rounded-xl bg-sky-50 border border-sky-300">
                <span className="block font-bold text-sky-950">Webhook Twilio (WhatsApp / SMS):</span>
                <span className="font-mono font-bold text-sky-900 text-xs break-all">
                  http://18.234.219.58/sms
                </span>
              </div>
            </div>
          </div>

          {/* Registro de Actividad en Vivo */}
          <div className="bg-charcoal-950 p-5 rounded-3xl border-2 border-charcoal-900 text-charcoal-100 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-charcoal-400 flex items-center gap-1.5">
                <ChatsCircle weight="bold" className="w-4 h-4 text-emerald-400" />
                <span>Registro de Actividad del Bot</span>
              </span>
              <span className="text-[10px] font-mono text-charcoal-400">
                Mensajes: {botData?.processedMessages || 0}
              </span>
            </div>

            <div className="h-40 overflow-y-auto space-y-1.5 font-mono text-[11px] pr-1">
              {botData?.logs && botData.logs.length > 0 ? (
                botData.logs.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-charcoal-500 shrink-0">[{item.timeFormatted}]</span>
                    <span
                      className={
                        item.type === 'error'
                          ? 'text-rose-400'
                          : item.type === 'success'
                          ? 'text-emerald-400'
                          : item.type === 'warn'
                          ? 'text-amber-300'
                          : 'text-charcoal-300'
                      }
                    >
                      {item.text}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-charcoal-500 text-xs italic py-4 text-center">
                  Sin eventos recientes. El bot está listo para recibir mensajes.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
