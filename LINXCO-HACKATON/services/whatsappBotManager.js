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
    this.helpers = {};
    this.reconnectTimeout = null;
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

  cleanAuthFiles() {
    if (fs.existsSync(AUTH_DIR)) {
      try {
        fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        this.log('Credenciales de sesión borradas de auth_info_baileys.', 'info');
      } catch (err) {
        console.error('Error borrando credenciales:', err.message);
      }
    }
  }

  cleanupSocket() {
    if (this.sock) {
      try {
        this.sock.ev.removeAllListeners();
        this.sock.end(undefined);
      } catch (_) {}
      this.sock = null;
    }
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
    if (helpers && Object.keys(helpers).length > 0) {
      this.helpers = { ...this.helpers, ...helpers };
    }

    if (this.status === 'CONNECTED') {
      this.log('El bot ya se encuentra activo y conectado.', 'warn');
      return this.getStatus();
    }

    this.isManualStop = false;
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    return this.initSocket();
  }

  async initSocket() {
    this.cleanupSocket();
    this.status = 'CONNECTING';
    this.lastError = null;
    this.startedAt = new Date().toISOString();
    this.log('Iniciando conexión con WhatsApp Baileys...');

    try {
      if (!fs.existsSync(AUTH_DIR)) {
        fs.mkdirSync(AUTH_DIR, { recursive: true });
      }

      // Si existe un archivo creds.json corrupto o con pairing incompleto (registered: false), limpiarlo
      const credsPath = path.join(AUTH_DIR, 'creds.json');
      if (fs.existsSync(credsPath)) {
        try {
          const credsData = JSON.parse(fs.readFileSync(credsPath, 'utf8'));
          if (credsData && credsData.registered === false && !credsData.me) {
            this.log('Detectado intento de emparejamiento no completado. Limpiando credenciales residuales...');
            this.cleanAuthFiles();
            fs.mkdirSync(AUTH_DIR, { recursive: true });
          }
        } catch (_) {
          this.cleanAuthFiles();
          fs.mkdirSync(AUTH_DIR, { recursive: true });
        }
      }

      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

      this.sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'silent' }),
        browser: ['Linxco Justicia Rural', 'Chrome', '1.0.0'],
      });

      this.sock.ev.on('creds.update', saveCreds);

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.status = 'WAITING_QR';
          this.qrCode = qr;
          try {
            this.qrDataUrl = await QRCode.toDataURL(qr, { width: 340, margin: 2 });
          } catch (qrErr) {
            console.error('Error generando QR data URL:', qrErr);
          }
          this.log('Nuevo código QR generado. Escanéalo desde WhatsApp > Dispositivos vinculados.');
          try {
            qrcodeTerminal.generate(qr, { small: true });
          } catch (_) {}
        }

        if (connection === 'open') {
          this.status = 'CONNECTED';
          this.qrCode = null;
          this.qrDataUrl = null;
          const userJid = this.sock?.user?.id || '';
          this.phoneNumber = userJid ? '+' + userJid.split(':')[0].split('@')[0] : 'Conectado';
          this.log(`WhatsApp vinculado exitosamente como ${this.phoneNumber}!`, 'success');
        }

        if (connection === 'close') {
          const statusCode = lastDisconnect?.error?.output?.statusCode;
          const isLoggedOut = statusCode === DisconnectReason.loggedOut || statusCode === 401;
          const shouldReconnect = !this.isManualStop && !isLoggedOut;

          this.log(
            `Conexión cerrada (${statusCode || 'desconocido'}). Reconectando: ${shouldReconnect}`,
            isLoggedOut ? 'error' : 'warn'
          );

          if (isLoggedOut) {
            this.status = 'STOPPED';
            this.phoneNumber = null;
            this.qrCode = null;
            this.qrDataUrl = null;
            this.cleanAuthFiles();
            this.cleanupSocket();
            this.log('Sesión no autorizada o cerrada (401). Credenciales reseteadas para nuevo QR.', 'info');
            return;
          }

          if (this.isManualStop) {
            this.status = 'STOPPED';
            this.cleanupSocket();
            return;
          }

          if (shouldReconnect) {
            this.cleanupSocket();
            if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = setTimeout(() => {
              if (!this.isManualStop) {
                this.initSocket();
              }
            }, 2000);
          }
        }
      });

      // Procesamiento de mensajes entrantes
      this.sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type !== 'notify') return;
        const { getOrCreateUsuario, procesarMensaje } = this.helpers;

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
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    this.status = 'STOPPED';
    this.qrCode = null;
    this.qrDataUrl = null;
    this.log('Deteniendo bot de WhatsApp por solicitud del usuario...');

    this.cleanupSocket();
    this.log('Bot de WhatsApp detenido exitosamente.');
    return this.getStatus();
  }

  async logout() {
    await this.stop();
    this.cleanAuthFiles();
    this.phoneNumber = null;
    return this.getStatus();
  }

  async reset(helpers = {}) {
    await this.logout();
    return this.start(helpers);
  }
}

const botManager = new WhatsAppBotManager();
module.exports = { botManager };
