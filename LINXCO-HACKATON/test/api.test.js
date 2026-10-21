const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const {
  app,
  getOrCreateUsuario,
  procesarMensaje,
  generarCodigoCaso,
  registrarCaso,
  supabase,
} = require('../index.js');

describe('Linxco Backend REST API & Modules', () => {
  let server;
  let baseUrl;
  const createdCodes = [];

  before(async () => {
    // Start HTTP server on dynamic port
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    // Clean up test cases created in Supabase
    if (createdCodes.length > 0) {
      try {
        await supabase.from('casos').delete().in('codigo_sms', createdCodes);
      } catch (err) {
        console.error('Error limpiando casos de prueba:', err);
      }
    }

    // Close server
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('Module Exports Preservation', () => {
    it('should export app as an Express instance', () => {
      assert.ok(app);
      assert.strictEqual(typeof app.use, 'function');
      assert.strictEqual(typeof app.listen, 'function');
    });

    it('should export getOrCreateUsuario and procesarMensaje for whatsapp_bot.js', () => {
      assert.strictEqual(typeof getOrCreateUsuario, 'function');
      assert.strictEqual(typeof procesarMensaje, 'function');
    });

    it('should export case generation and registration helpers', () => {
      assert.strictEqual(typeof generarCodigoCaso, 'function');
      assert.strictEqual(typeof registrarCaso, 'function');
    });
  });

  describe('CORS & Preflight Handling', () => {
    it('should handle OPTIONS preflight with 204 and CORS headers', async () => {
      const res = await fetch(`${baseUrl}/api/casos`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:5173',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type',
        },
      });

      assert.strictEqual(res.status, 204);
      assert.strictEqual(res.headers.get('access-control-allow-origin'), '*');
      assert.ok(res.headers.get('access-control-allow-methods').includes('POST'));
      assert.ok(res.headers.get('access-control-allow-headers').includes('Content-Type'));
    });

    it('should return CORS headers on regular GET requests', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(res.headers.get('access-control-allow-origin'), '*');
    });
  });

  describe('GET /api/health', () => {
    it('should return 200 with health status and timestamp', async () => {
      const res = await fetch(`${baseUrl}/api/health`);
      assert.strictEqual(res.status, 200);
      assert.ok(res.headers.get('content-type').includes('application/json'));

      const data = await res.json();
      assert.strictEqual(data.status, 'ok');
      assert.strictEqual(data.service, 'linxco-backend');
      assert.ok(data.timestamp);
      assert.ok(!isNaN(Date.parse(data.timestamp)));
    });
  });

  describe('POST /api/casos (Case Creation)', () => {
    it('should create a new case with full wizard payload and return 201 with CASO-XXX', async () => {
      const payload = {
        tipo_problema: 'Derecho de petición (Educación: Faltan profesores)',
        formulario_web: {
          mecanismo: 'Derecho de petición',
          categoria: 'Educación',
          ciudadano: {
            nombre_completo: 'María Gómez',
            numero_documento: '1002345678',
            telefono: '+573101234567',
            municipio: 'Silvia',
            vereda: 'Usenda',
          },
          entidad: 'Secretaría de Educación del Cauca',
          hechos: 'Desde hace tres meses la escuela rural no cuenta con docente.',
          peticion: 'Nombrar un docente en propiedad.',
        },
        estado: 'BORRADOR',
      };

      const res = await fetch(`${baseUrl}/api/casos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();

      assert.strictEqual(data.success, true);
      assert.match(data.codigo, /^CASO-[A-Z0-9]{3}$/);
      assert.ok(data.caso);
      assert.strictEqual(data.caso.codigo_sms, data.codigo);
      assert.strictEqual(data.caso.tipo_problema, payload.tipo_problema);
      assert.strictEqual(data.caso.estado, 'BORRADOR');
      assert.deepStrictEqual(data.caso.formulario_web, payload.formulario_web);

      createdCodes.push(data.codigo);
    });

    it('should fallback tipo_problema to formulario_web.mecanismo when tipo_problema is omitted', async () => {
      const payload = {
        formulario_web: {
          mecanismo: 'Acción de tutela',
          categoria: 'Salud',
          hechos: 'Falta de medicamentos vitales.',
        },
      };

      const res = await fetch(`${baseUrl}/api/casos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();

      assert.strictEqual(data.success, true);
      assert.match(data.codigo, /^CASO-[A-Z0-9]{3}$/);
      assert.strictEqual(data.caso.tipo_problema, 'Acción de tutela');
      assert.strictEqual(data.caso.estado, 'BORRADOR');

      createdCodes.push(data.codigo);
    });

    it('should fallback tipo_problema to default when payload is empty', async () => {
      const res = await fetch(`${baseUrl}/api/casos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();

      assert.strictEqual(data.success, true);
      assert.match(data.codigo, /^CASO-[A-Z0-9]{3}$/);
      assert.strictEqual(data.caso.tipo_problema, 'Trámite ciudadano');
      assert.strictEqual(data.caso.estado, 'BORRADOR');

      createdCodes.push(data.codigo);
    });

    it('should reject invalid estado on case creation with 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/api/casos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_problema: 'Derecho de petición',
          estado: 'INVALID_STATUS_XYZ',
        }),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('Estado inválido'));
    });

    it('should accept valid estado on case creation with 201 Created', async () => {
      const res = await fetch(`${baseUrl}/api/casos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_problema: 'Derecho de petición',
          estado: 'VALIDADO',
        }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      assert.strictEqual(data.caso.estado, 'VALIDADO');
      createdCodes.push(data.codigo);
    });
  });

  describe('GET /api/casos/:codigo (Case Retrieval)', () => {
    let testCode;

    before(async () => {
      // Create a test case
      const res = await fetch(`${baseUrl}/api/casos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_problema: 'Prueba Consulta',
          formulario_web: { test: true },
          estado: 'BORRADOR',
        }),
      });
      const data = await res.json();
      testCode = data.codigo;
      createdCodes.push(testCode);
    });

    it('should retrieve existing case by uppercase code with 200 OK', async () => {
      const res = await fetch(`${baseUrl}/api/casos/${testCode}`);
      assert.strictEqual(res.status, 200);

      const caso = await res.json();
      assert.strictEqual(caso.codigo_sms, testCode);
      assert.strictEqual(caso.tipo_problema, 'Prueba Consulta');
      assert.strictEqual(caso.estado, 'BORRADOR');
      assert.deepStrictEqual(caso.formulario_web, { test: true });
    });

    it('should retrieve existing case by lowercase code (case-insensitive)', async () => {
      const res = await fetch(`${baseUrl}/api/casos/${testCode.toLowerCase()}`);
      assert.strictEqual(res.status, 200);

      const caso = await res.json();
      assert.strictEqual(caso.codigo_sms, testCode);
    });

    it('should return 404 for non-existent case code', async () => {
      const res = await fetch(`${baseUrl}/api/casos/CASO-NONEXISTENT999`);
      assert.strictEqual(res.status, 404);

      const data = await res.json();
      assert.strictEqual(data.error, 'Caso no encontrado');
      assert.strictEqual(data.codigo, 'CASO-NONEXISTENT999');
    });

    it('should return 404 for wildcard "%" without SQL injection or crashing', async () => {
      const res = await fetch(`${baseUrl}/api/casos/%25`);
      assert.strictEqual(res.status, 404);
      const data = await res.json();
      assert.strictEqual(data.error, 'Caso no encontrado');
    });

    it('should return 404 for wildcard "_" without matching any case', async () => {
      const res = await fetch(`${baseUrl}/api/casos/_`);
      assert.strictEqual(res.status, 404);
      const data = await res.json();
      assert.strictEqual(data.error, 'Caso no encontrado');
    });
  });

  describe('PUT /api/casos/:codigo (Case Update)', () => {
    let testCode;

    before(async () => {
      const res = await fetch(`${baseUrl}/api/casos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_problema: 'Caso para actualización',
          formulario_web: { step: 1 },
          estado: 'BORRADOR',
        }),
      });
      const data = await res.json();
      testCode = data.codigo;
      createdCodes.push(testCode);
    });

    it('should update estado and formulario_web returning 200 OK', async () => {
      const patch = {
        estado: 'VALIDADO',
        formulario_web: { step: 2, validated: true },
      };

      const res = await fetch(`${baseUrl}/api/casos/${testCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });

      assert.strictEqual(res.status, 200);
      const data = await res.json();

      assert.strictEqual(data.success, true);
      assert.strictEqual(data.caso.codigo_sms, testCode);
      assert.strictEqual(data.caso.estado, 'VALIDADO');
      assert.deepStrictEqual(data.caso.formulario_web, patch.formulario_web);

      // Verify persistence via GET
      const verifyRes = await fetch(`${baseUrl}/api/casos/${testCode}`);
      const verified = await verifyRes.json();
      assert.strictEqual(verified.estado, 'VALIDADO');
      assert.deepStrictEqual(verified.formulario_web, patch.formulario_web);
    });

    it('should progress case across all 5 status values', async () => {
      const estados = ['VALIDADO', 'ENVIADO', 'RADICADO', 'RESPUESTA RECIBIDA'];
      for (const estado of estados) {
        const res = await fetch(`${baseUrl}/api/casos/${testCode}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado }),
        });
        assert.strictEqual(res.status, 200);
        const data = await res.json();
        assert.strictEqual(data.caso.estado, estado);
      }
    });

    it('should return 400 when updating with empty body', async () => {
      const res = await fetch(`${baseUrl}/api/casos/${testCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, 'No se enviaron campos válidos para actualizar');
    });

    it('should return 404 when updating non-existent case', async () => {
      const res = await fetch(`${baseUrl}/api/casos/CASO-NONEXISTENT999`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'VALIDADO' }),
      });

      assert.strictEqual(res.status, 404);
      const data = await res.json();
      assert.strictEqual(data.error, 'Caso no encontrado para actualizar');
    });

    it('should return 404 for wildcard "%" update without mutating records', async () => {
      const res = await fetch(`${baseUrl}/api/casos/%25`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'VALIDADO' }),
      });
      assert.strictEqual(res.status, 404);
      const data = await res.json();
      assert.strictEqual(data.error, 'Caso no encontrado para actualizar');
    });

    it('should return 400 when updating estado with an invalid value', async () => {
      const res = await fetch(`${baseUrl}/api/casos/${testCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'ESTADO_INVENTADO_123' }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.ok(data.error.includes('Estado inválido'));
    });

    it('should return 400 when updating tipo_problema with null', async () => {
      const res = await fetch(`${baseUrl}/api/casos/${testCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo_problema: null }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, 'El tipo_problema no puede ser nulo o vacío');
    });

    it('should return 400 when updating tipo_problema with empty or whitespace string', async () => {
      const res = await fetch(`${baseUrl}/api/casos/${testCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo_problema: '   ' }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, 'El tipo_problema no puede ser nulo o vacío');
    });
  });

  describe('Twilio Webhook /sms Preservation', () => {
    it('should respond to POST /sms with text/xml MessagingResponse', async () => {
      const formData = new URLSearchParams();
      formData.append('From', 'whatsapp:+573009999999');
      formData.append('Body', 'hola');

      const res = await fetch(`${baseUrl}/sms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      assert.strictEqual(res.status, 200);
      assert.ok(res.headers.get('content-type').includes('text/xml'));
      const xml = await res.text();
      assert.ok(xml.includes('<Response>'));
      assert.ok(xml.includes('<Message>'));
    });
  });

  describe('Document Generation & Elimination of ANEXOS Section', () => {
    const fs = require('fs');
    const PizZip = require('pizzip');
    const { generarDocumentoDesdePlantilla } = require('../services/templateService.js');

    it('should eliminate ANEXOS section and inject separate EDAD_MENOR and GRADO_ESCOLAR_SOLICITADO', () => {
      const res = generarDocumentoDesdePlantilla({
        codigo: 'CASO-EDG',
        datosCiudadano: {
          NOMBRE_ACCIONANTE: 'Patricia Caicedo',
          NUMERO_DOCUMENTO_ACCIONANTE: '31888777',
          NOMBRE_MENOR: 'Sebastián Morales',
          EDAD_MENOR: '9',
          GRADO_ESCOLAR_SOLICITADO: 'Cuarto (4°)',
          ENTIDAD_RECEPTORA_SOLICITUD: 'Secretaría de Educación',
          VEREDA_CORREGIMIENTO_O_BARRIO: 'Vereda Lomitas',
        },
        plantilla: 'TUTELA CUPO COLEGIO.docx',
      });

      assert.ok(fs.existsSync(res.filePath));
      const zip = new PizZip(fs.readFileSync(res.filePath));
      const xml = zip.file('word/document.xml').asText();
      const text = xml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

      // Should have injected the specific age and grade variables
      assert.ok(text.includes('9 años'));
      assert.ok(text.includes('Cuarto (4°)'));

      // Should have eliminated the ANEXOS section
      assert.strictEqual(/(?:PRUEBAS Y ANEXOS|ANEXOS Y PRUEBAS|\bANEXOS\b)/i.test(text), false);
    });
  });
});
