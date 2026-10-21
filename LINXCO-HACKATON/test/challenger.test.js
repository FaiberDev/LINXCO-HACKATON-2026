const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const { app, supabase } = require('../index.js');

describe('Adversarial API Verification Suite (M1 Challenger)', () => {
  let server;
  let baseUrl;
  const createdCodes = [];

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    if (createdCodes.length > 0) {
      try {
        await supabase.from('casos').delete().in('codigo_sms', createdCodes);
      } catch (err) {
        console.error('Error limpiando casos creados:', err);
      }
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  // =========================================================================
  // 1. OPTIONS Preflight & CORS Behavior
  // =========================================================================
  describe('Suite 1: OPTIONS Preflight & CORS Across All Endpoints', () => {
    it('should respond to OPTIONS on /api/casos with 204 and complete CORS headers', async () => {
      const res = await fetch(`${baseUrl}/api/casos`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:5173',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization',
        },
      });
      assert.strictEqual(res.status, 204);
      assert.strictEqual(res.headers.get('access-control-allow-origin'), '*');
      assert.ok(res.headers.get('access-control-allow-methods').includes('POST'));
      assert.ok(res.headers.get('access-control-allow-methods').includes('PUT'));
      assert.ok(res.headers.get('access-control-allow-methods').includes('GET'));
      assert.ok(res.headers.get('access-control-allow-methods').includes('OPTIONS'));
      assert.ok(res.headers.get('access-control-allow-headers').includes('Content-Type'));
    });

    it('should respond to OPTIONS on parametrized route /api/casos/:codigo with 204', async () => {
      const res = await fetch(`${baseUrl}/api/casos/CASO-TEST1`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'http://localhost:5173',
          'Access-Control-Request-Method': 'PUT',
        },
      });
      assert.strictEqual(res.status, 204);
      assert.strictEqual(res.headers.get('access-control-allow-origin'), '*');
    });

    it('should include CORS headers on 404 responses', async () => {
      const res = await fetch(`${baseUrl}/api/casos/CASO-DEFINITELY-NOT-FOUND-999`);
      assert.strictEqual(res.status, 404);
      assert.strictEqual(res.headers.get('access-control-allow-origin'), '*');
    });

    it('should include CORS headers on 400 Bad Request responses', async () => {
      const res = await fetch(`${baseUrl}/api/casos/CASO-TEST1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.headers.get('access-control-allow-origin'), '*');
    });
  });

  // =========================================================================
  // 2. Malformed JSON, Bad Headers & Primitives
  // =========================================================================
  describe('Suite 2: Malformed Inputs & Edge-Case Payloads', () => {
    it('should reject malformed JSON in POST /api/casos with 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/api/casos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{"tipo_problema": "incomplete...',
      });
      assert.strictEqual(res.status, 400);
    });

    it('should handle POST /api/casos with non-object JSON body (number/string/array) gracefully', async () => {
      // Test number payload
      const resNum = await fetch(`${baseUrl}/api/casos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '12345',
      });
      // Express express.json() might parse 12345 as number; req.body is 12345.
      // Should either return 201 with fallback or 400, but NOT crash or 500
      assert.ok([201, 400].includes(resNum.status), `Expected 201 or 400, got ${resNum.status}`);
      if (resNum.status === 201) {
        const d = await resNum.json();
        createdCodes.push(d.codigo);
      }

      // Test array payload
      const resArr = await fetch(`${baseUrl}/api/casos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ evil: true }]),
      });
      assert.ok([201, 400].includes(resArr.status), `Expected 201 or 400, got ${resArr.status}`);
      if (resArr.status === 201) {
        const d = await resArr.json();
        createdCodes.push(d.codigo);
      }
    });

    it('should reject PUT /api/casos/:codigo with malformed JSON with 400', async () => {
      const res = await fetch(`${baseUrl}/api/casos/CASO-TEST1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: '{ "estado": ',
      });
      assert.strictEqual(res.status, 400);
    });

    it('should reject PUT /api/casos/:codigo when payload contains only unknown/invalid keys', async () => {
      const res = await fetch(`${baseUrl}/api/casos/CASO-TEST1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ injected_field: 'malicious', admin: true }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, 'No se enviaron campos válidos para actualizar');
    });
  });

  // =========================================================================
  // 3. Case Insensitivity, Spaces, Special Chars & Wildcards in Tracking Code
  // =========================================================================
  describe('Suite 3: Tracking Code Normalization & Injection Resilience', () => {
    let targetCode;

    before(async () => {
      const res = await fetch(`${baseUrl}/api/casos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_problema: 'Prueba Normalizacion Codigo',
          formulario_web: { ciudad: 'Popayán' },
        }),
      });
      assert.strictEqual(res.status, 201);
      const data = await res.json();
      targetCode = data.codigo;
      createdCodes.push(targetCode);
    });

    it('should look up case with lower-case tracking code', async () => {
      const res = await fetch(`${baseUrl}/api/casos/${targetCode.toLowerCase()}`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.codigo_sms, targetCode);
    });

    it('should look up case with mixed-case tracking code', async () => {
      const mixed = targetCode
        .split('')
        .map((c, i) => (i % 2 === 0 ? c.toLowerCase() : c.toUpperCase()))
        .join('');
      const res = await fetch(`${baseUrl}/api/casos/${mixed}`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.codigo_sms, targetCode);
    });

    it('should look up case with URL-encoded leading/trailing spaces', async () => {
      const res = await fetch(`${baseUrl}/api/casos/%20${targetCode}%20`);
      assert.strictEqual(res.status, 200);
      const data = await res.json();
      assert.strictEqual(data.codigo_sms, targetCode);
    });

    it('should return 400 for empty or whitespace-only code', async () => {
      const res = await fetch(`${baseUrl}/api/casos/%20%20`);
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, 'El código de seguimiento es requerido');
    });

    it('should handle SQL wildcard "%" in GET /api/casos/:codigo returning 404 without 500 error or mass matching', async () => {
      // Testing "%" or "CASO-%" wildcard
      const res = await fetch(`${baseUrl}/api/casos/%25`);
      const status = res.status;
      const body = await res.json();
      console.log('Empirical observation for GET /api/casos/%:', { status, body });
      assert.strictEqual(status, 404);
      assert.strictEqual(body.error, 'Caso no encontrado');
    });

    it('should return 404 for PUT /api/casos/:codigo with wildcard "%" preventing mass mutation', async () => {
      const res = await fetch(`${baseUrl}/api/casos/%25`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'BORRADOR' }),
      });
      const status = res.status;
      const body = await res.json();
      console.log('Empirical observation for PUT /api/casos/%:', { status, body });
      assert.strictEqual(status, 404);
      assert.strictEqual(body.error, 'Caso no encontrado para actualizar');
    });
  });

  // =========================================================================
  // 4. Unicode, Spanish Accents, XSS Strings & Deep JSON
  // =========================================================================
  describe('Suite 4: Unicode, Spanish Characters, XSS Payloads & Deep JSON', () => {
    it('should correctly store and retrieve Spanish accents, ñ, and special characters', async () => {
      const payload = {
        tipo_problema: 'Acción de Tutela — Salud: Medicamentos y Cirugía del Corazón',
        formulario_web: {
          ciudadano: {
            nombre_completo: 'Ñusta González de la Peña',
            vereda: 'El Cañón & La Cabaña',
            municipio: 'Silvia (Cauca)',
          },
          hechos: 'El señor José María Martínez no recibió los medicamentos prescritos por el médico tratante.',
          peticion: '¡Exijo entrega inmediata de fármacos vitales para vivir dignamente!',
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
      const code = data.codigo;
      createdCodes.push(code);

      // Verify retrieval
      const getRes = await fetch(`${baseUrl}/api/casos/${code}`);
      assert.strictEqual(getRes.status, 200);
      const fetched = await getRes.json();

      assert.strictEqual(fetched.tipo_problema, payload.tipo_problema);
      assert.deepStrictEqual(fetched.formulario_web, payload.formulario_web);
    });

    it('should store and retrieve payloads with HTML/XSS characters without unescaping corruption', async () => {
      const xssPayload = {
        tipo_problema: '<script>alert("xss")</script>',
        formulario_web: {
          test: '<img src=x onerror=alert(1)>',
          sql_probe: "'; DROP TABLE casos; --",
        },
      };

      const res = await fetch(`${baseUrl}/api/casos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(xssPayload),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      const code = data.codigo;
      createdCodes.push(code);

      const getRes = await fetch(`${baseUrl}/api/casos/${code}`);
      assert.strictEqual(getRes.status, 200);
      const fetched = await getRes.json();

      assert.strictEqual(fetched.tipo_problema, xssPayload.tipo_problema);
      assert.strictEqual(fetched.formulario_web.test, xssPayload.formulario_web.test);
      assert.strictEqual(fetched.formulario_web.sql_probe, xssPayload.formulario_web.sql_probe);
    });

    it('should handle deeply nested JSON objects in formulario_web', async () => {
      const deepObj = { l1: { l2: { l3: { l4: { l5: { value: 'deep_rural_data' } } } } } };
      const res = await fetch(`${baseUrl}/api/casos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formulario_web: deepObj }),
      });

      assert.strictEqual(res.status, 201);
      const data = await res.json();
      createdCodes.push(data.codigo);

      const getRes = await fetch(`${baseUrl}/api/casos/${data.codigo}`);
      const fetched = await getRes.json();
      assert.deepStrictEqual(fetched.formulario_web, deepObj);
    });
  });

  // =========================================================================
  // 5. Concurrency & Stress Testing
  // =========================================================================
  describe('Suite 5: Concurrency & Stress Testing', () => {
    it('should handle 20 concurrent case creation requests without duplicate codes or failures', async () => {
      const count = 20;
      const requests = Array.from({ length: count }, (_, i) =>
        fetch(`${baseUrl}/api/casos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tipo_problema: `Concurrencia Test #${i}`,
            formulario_web: { index: i, timestamp: Date.now() },
            estado: 'BORRADOR',
          }),
        }).then(async (r) => {
          assert.strictEqual(r.status, 201, `Failed on concurrent index ${i}`);
          return r.json();
        })
      );

      const results = await Promise.all(requests);
      assert.strictEqual(results.length, count);

      const codes = results.map((r) => r.codigo);
      codes.forEach((c) => createdCodes.push(c));

      // Assert all codes are unique
      const uniqueCodes = new Set(codes);
      assert.strictEqual(uniqueCodes.size, count, `Collision detected in concurrent codes: ${codes}`);

      // All returned codes match CASO-XXX format
      for (const code of codes) {
        assert.match(code, /^CASO-[A-Z0-9]{3}$/);
      }
    });

    it('should handle rapid sequential PUT updates on the same case without corruption', async () => {
      const createRes = await fetch(`${baseUrl}/api/casos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo_problema: 'Test Sequential PUT' }),
      });
      const createData = await createRes.json();
      const code = createData.codigo;
      createdCodes.push(code);

      const statuses = ['BORRADOR', 'VALIDADO', 'ENVIADO', 'RADICADO', 'RESPUESTA RECIBIDA'];
      for (const st of statuses) {
        const putRes = await fetch(`${baseUrl}/api/casos/${code}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estado: st }),
        });
        assert.strictEqual(putRes.status, 200);
        const putData = await putRes.json();
        assert.strictEqual(putData.caso.estado, st);
      }

      // Verify final state
      const getRes = await fetch(`${baseUrl}/api/casos/${code}`);
      const finalData = await getRes.json();
      assert.strictEqual(finalData.estado, 'RESPUESTA RECIBIDA');
    });
  });

  // =========================================================================
  // 6. Estado Validation & Contract Boundaries
  // =========================================================================
  describe('Suite 6: Estado Field Handling & Boundaries', () => {
    let testCode;

    before(async () => {
      const res = await fetch(`${baseUrl}/api/casos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo_problema: 'Estado Boundary Test' }),
      });
      const data = await res.json();
      testCode = data.codigo;
      createdCodes.push(testCode);
    });

    it('should reject updating estado with non-standard value with 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/api/casos/${testCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'ESTADO_INVENTADO_123' }),
      });
      const status = res.status;
      const data = await res.json();
      console.log('Empirical observation for unconstrained estado:', { status, data });
      assert.strictEqual(status, 400);
      assert.ok(data.error.includes('Estado inválido'));
    });

    it('should reject updating tipo_problema with null with 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/api/casos/${testCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo_problema: null }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, 'El tipo_problema no puede ser nulo o vacío');
    });

    it('should reject updating tipo_problema with empty string with 400 Bad Request', async () => {
      const res = await fetch(`${baseUrl}/api/casos/${testCode}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo_problema: '' }),
      });
      assert.strictEqual(res.status, 400);
      const data = await res.json();
      assert.strictEqual(data.error, 'El tipo_problema no puede ser nulo o vacío');
    });
  });
});
