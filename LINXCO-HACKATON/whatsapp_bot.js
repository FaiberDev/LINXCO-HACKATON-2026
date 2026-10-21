require('dotenv').config();
const { app, getOrCreateUsuario, procesarMensaje } = require('./index.js');
const { botManager } = require('./services/whatsappBotManager');

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

console.log('🤖 Iniciando Bot de WhatsApp...');
botManager.start({ getOrCreateUsuario, procesarMensaje });
