const fs = require('fs');
const path = require('path');
const pino = require('pino');
const QRCode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');

const AUTH_DIR = path.join(__dirname, '..', 'auth_info_baileys');

class WhatsAppBotManager {
  constructor() {
    this.sock = null;
    this.status = 'STOPPED'; // 'STOPPED' | 'CONNECTING' | 'WAITING_QR' | 'CONNECTED'
    this.qrCode = null;
    this.qrDataUrl = null;
    this.phoneNumber = null;
    this.lastError = null;
    this.startedAt = null;
    this.processedMessages = 0;
    this.logs = [];
    this.isManualStop = false;
  }

  log(msg, type = 'info') {
    const entry = {
      timestamp: new Date().toISOString(),
      timeFormatted: new Date().toLocaleTimeString('es-CO'),
      type,
      text: msg,
    };
    this.logs.unshift(entry);
    if (this.logs.length > 50) this.logs.pop();
    console.log(`[WSP-BOT] [${type.toUpperCase()}] ${msg}`);
  }

  getStatus() {
    const sessionExists = fs.existsSync(AUTH_DIR) && fs.readdirSync(AUTH_DIR).length > 0;
    return {
      status: this.status,
      isConnected: this.status === 'CONNECTED',
      isWaitingQr: this.status === 'WAITING_QR',
      isConnecting: this.status === 'CONNECTING',
      isStopped: this.status === 'STOPPED',
      qrCode: this.qrCode,
      qrDataUrl: this.qrDataUrl,
      phoneNumber: this.phoneNumber,
      sessionExists,
      startedAt: this.startedAt,
      processedMessages: this.processedMessages,
      lastError: this.lastError,
      logs: this.logs.slice(0, 20),
    };
  }

  async start(helpers = {}) {
    if (this.status === 'CONNECTED' || this.status === 'CONNECTING') {
      this.log('El bot ya se encuentra activo o conectando.', 'warn');
      return this.getStatus();
    }

    this.isManualStop = false;
    this.status = 'CONNECTING';
    this.lastError = null;
    this.startedAt = new Date().toISOString();
    this.log('Iniciando conexión con WhatsApp Baileys...');

    try {
      if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.status = 'WAITING_QR';
          this.qrCode = qr;
          try {
            this.qrDataUrl = await QRCode.toDataURL(qr, { width: 320, margin: 2 });
          } catch (qrErr) {
            console.error('Error generando QR data URL:', qrErr);
          }
          this.log('Nuevo código QR generado. Escanéalo desde WhatsApp > Dispositivos vinculados.');
          qrcodeTerminal.generate(qr, { small: true });
        }

        if (connection === 'open') {
          this.status = 'CONNECTED';
          this.qrCode = null;
          this.qrDataUrl = null;
          const userJid = this.sock.user?.id || '';
          this.phoneNumber = userJid ? '+' + userJid.split(':')[0].split('@')[0] : 'Conectado';
          this.log(`WhatsApp vinculado exitosamente como ${this.phoneNumber}!`, 'success');
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const shouldReconnect = !this.isManualStop && statusCode !== DisconnectReason.loggedOut;
          this.log(`Conexión cerrada (${statusCode || 'desconocido'}). Reconectando: ${shouldReconnect}`, 'warn');

          if (this.isManualStop || statusCode === DisconnectReason.loggedOut) {
            this.status = 'STOPPED';
            this.phoneNumber = null;
            this.qrCode = null;
            this.qrDataUrl = null;
            this.sock = null;
          } else if (shouldReconnect) {
            this.status = 'CONNECTING';
            setTimeout(() => {
              if (!this.isManualStop) this.start(helpers);
            }, 3000);
          }
        }
      });

      // Procesamiento de mensajes entrantes
      this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const { getOrCreateUsuario, procesarMensaje } = helpers;

        for (const msg of messages) {
          if (!msg.message || msg.key.fromMe) continue;
          const jid = msg.key.remoteJid;
          if (!jid || jid.endsWith('@g.us') || jid === 'status@broadcast') continue;

          const telefono = '+' + jid.split('@')[0];
          const texto =
            msg.message.conversation ||
            msg.message.extendedTextMessage?.text ||
            '';

          if (!texto.trim()) continue;
          this.processedMessages += 1;
          this.log(`Mensaje de ${telefono}: "${texto.slice(0, 50)}"`);

          try {
            if (typeof getOrCreateUsuario === 'function' && typeof procesarMensaje === 'function') {
              const usuario = await getOrCreateUsuario(telefono);
              const respuesta = await procesarMensaje(usuario, texto);

              if (respuesta === null) {
                this.log(`Handoff Asesor activo para ${telefono}. Respuestas automáticas pausadas.`);
                continue;
              }

              await this.sock.sendMessage(jid, { text: respuesta });
              this.log(`Respuesta enviada a ${telefono}`, 'success');

              // Si se generó el documento Word, adjuntarlo
              if (
                usuario.ultimoDocumentoGenerado &&
                usuario.ultimoDocumentoGenerado.filePath &&
                fs.existsSync(usuario.ultimoDocumentoGenerado.filePath)
              ) {
                await this.sock.sendMessage(jid, {
                  document: fs.readFileSync(usuario.ultimoDocumentoGenerado.filePath),
                  fileName: usuario.ultimoDocumentoGenerado.filename,
                  mimetype:
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                  caption: `📄 Documento legal generado (${usuario.ultimoDocumentoGenerado.plantillaUsada})`,
                });
                this.log(`Documento adjunto enviado a ${telefono}`, 'success');
              }
            }
          } catch (err) {
            console.error('Error procesando mensaje en bot:', err);
            this.lastError = err.message;
            this.log(`Error con ${telefono}: ${err.message}`, 'error');
            try {
              await this.sock.sendMessage(jid, {
                text: '⚠️ Ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo.',
              });
            } catch (_) {}
          }
        }
      });
    } catch (err) {
      this.status = 'STOPPED';
      this.lastError = err.message;
      this.log(`Fallo al iniciar bot: ${err.message}`, 'error');
    }

    return this.getStatus();
  }

  async stop() {
    this.isManualStop = true;
    this.status = 'STOPPED';
    this.qrCode = null;
    this.qrDataUrl = null;
    this.log('Deteniendo bot de WhatsApp por solicitud del usuario...');

    if (this.sock) {
      try {
        this.sock.end(undefined);
      } catch (err) {
        console.warn('Advertencia cerrando socket:', err.message);
      }
      this.sock = null;
    }

    this.log('Bot de WhatsApp detenido exitosamente.');
    return this.getStatus();
  }

  async logout() {
    await this.stop();
    if (fs.existsSync(AUTH_DIR)) {
      try {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        this.log('Credenciales de sesión borradas de auth_info_baileys.', 'info');
      } catch (err) {
        console.error('Error borrando credenciales:', err);
      }
    }
    this.phoneNumber = null;
    return this.getStatus();
  }
}

const botManager = new WhatsAppBotManager();
module.exports = { botManager };
