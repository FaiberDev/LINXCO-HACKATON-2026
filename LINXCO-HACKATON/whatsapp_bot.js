require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const pino = require('pino');
const { app, getOrCreateUsuario, procesarMensaje } = require('./index.js');

// Levanta también la API REST del backend para sincronizar con el Frontend (ignora si ya está en otro proceso)
const PORT = process.env.PORT || 3000;
const apiServer = app.listen(PORT, () => {
  console.log(`🌐 API REST sincronizada con el Frontend activa en http://localhost:${PORT}`);
});
apiServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`ℹ️ La API REST ya está escuchando en el puerto ${PORT}.`);
  } else {
    console.error('Error iniciando API REST:', err);
  }
});

// ---- Conexión con WhatsApp (Baileys) ----
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) {
      console.log('\n======================================================');
      console.log('📲 ESCANEA ESTE CÓDIGO QR DESDE EL WHATSAPP DEL IPHONE');
      console.log('(WhatsApp > Ajustes > Dispositivos vinculados > Vincular dispositivo)');
      console.log('======================================================\n');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(`Conexión cerrada (${statusCode}). Reconectando: ${shouldReconnect}`);
      if (shouldReconnect) {
        startBot();
      }
    } else if (connection === 'open') {
      console.log('\n🎉 ================================================');
      console.log('✅ ¡WHATSAPP VINCULADO Y LISTO PARA LA DEMO!');
      console.log('Flujo completo del diagrama activo (Educativo, 9 Problemas y Consultorio Jurídico).');
      console.log('================================================\n');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
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

      console.log(`[Mensaje Recibido] De: ${telefono} | Texto: "${texto}"`);

      try {
        const usuario = await getOrCreateUsuario(telefono);
        const respuesta = await procesarMensaje(usuario, texto);

        await sock.sendMessage(jid, { text: respuesta });
        console.log(`[Respuesta Enviada] A: ${telefono}`);
      } catch (err) {
        console.error('Error procesando mensaje:', err);
        await sock.sendMessage(jid, {
          text: '⚠️ Ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo.',
        });
      }
    }
  });
}

startBot();
