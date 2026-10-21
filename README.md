# Justicia para Todos — Justicia en tu Vereda (LINXCO Hackathon 2026)

Plataforma legal multicanal (WhatsApp Bot con Baileys + Portal Web Mobile-First + Motor de Plantillas `.docx` + Paneles de Consultorio Jurídico) conectada en tiempo real a **Supabase PostgreSQL**.

## Estructura del Proyecto

- **`LINXCO-HACKATON/`** — Backend API REST (Express 5 + Supabase), Bot de WhatsApp (`@whiskeysockets/baileys`) y Motor de Plantillas (`docxtemplater` + `pizzip`).
  - `index.js`: Servidor API REST y máquina de estados (FSM) del chatbot.
  - `whatsapp_bot.js`: Cliente de WhatsApp con Baileys sincronizado con la API REST.
  - `models/Solicitud.js`: Modelo unificado sobre `public.casos` / `public.solicitudes`.
  - `services/templateService.js`: Motor de inyección de variables en plantillas Word (`CIUDAD.docx`, `TUTELA CIRUGIA.docx`, `TUTELA CUPO COLEGIO.docx`).
  - `middleware/auth.js`: Autenticación y control de acceso por roles (`Jefe de Consultorio` y `Asesor Jurídico`).
- **`LINXCO-HACKATON-FRONTEND/`** — Frontend Ciudadano y Dashboards Administrativos (React 18 + TypeScript + Vite + Tailwind CSS).
  - Flujo Ciudadano Mobile-First: Landing Page, Portal de Continuación (`CASO-XXX`), Wizard Dinámico por pasos, Visualizador de 5 estados (`BORRADOR`, `VALIDADO`, `ENVIADO`, `RADICADO`, `RESPUESTA RECIBIDA`), Guías Educativas y Solicitud de Asesor.
  - Dashboards de Consultorio Jurídico: Login por rol (`/login`), Panel del Jefe de Consultorio (`/admin/jefe`) y Panel del Asesor Jurídico (`/admin/asesor`).

## Ejecución Rápida

### 1. Backend y Bot de WhatsApp
```bash
cd LINXCO-HACKATON
npm install
node index.js
# O para iniciar tanto el Bot de WhatsApp (Baileys) como la API REST en el puerto 3000:
node whatsapp_bot.js
```

### 2. Frontend (React + Vite)
```bash
cd LINXCO-HACKATON-FRONTEND
npm install
npm run dev
```

## Credenciales de Demostración (`/login`)
- **Jefe de Consultorio:** Documento `1000100100` | Contraseña `admin123`
- **Asesora Jurídica 1 (Laura Ríos):** Documento `1000200201` | Contraseña `asesor123`
- **Asesor Jurídico 2 (Andrés Morales):** Documento `1000200202` | Contraseña `asesor123`
- **Asesora Jurídica 3 (Camila Soto):** Documento `1000200203` | Contraseña `asesor123`
