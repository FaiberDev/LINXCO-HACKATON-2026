const fs = require('fs');
const path = require('path');
const PizZip = require('pizzip');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

/**
 * Divide un texto en líneas que quepan en un ancho máximo determinado
 */
function dividirTextoEnLineas(texto, font, fontSize, maxWidth) {
  if (!texto) return [];
  const palabras = String(texto).replace(/\s+/g, ' ').trim().split(' ');
  const lineas = [];
  let lineaActual = '';

  for (const palabra of palabras) {
    const prueba = lineaActual ? `${lineaActual} ${palabra}` : palabra;
    const anchoPrueba = font.widthOfTextAtSize(prueba, fontSize);
    if (anchoPrueba <= maxWidth) {
      lineaActual = prueba;
    } else {
      if (lineaActual) lineas.push(lineaActual);
      lineaActual = palabra;
    }
  }
  if (lineaActual) lineas.push(lineaActual);
  return lineas;
}

/**
 * Divide un texto para párrafos con encabezado/prefijo:
 * - La primera línea usa el espacio restante disponible (anchoPrimeraLinea)
 * - Las siguientes líneas ocupan el ancho completo (anchoLineasSiguientes)
 */
function dividirTextoEnLineasConPrefijo(
  texto,
  font,
  fontSize,
  anchoPrimeraLinea,
  anchoLineasSiguientes
) {
  if (!texto) return [];
  const palabras = String(texto).replace(/\s+/g, ' ').trim().split(' ');
  const lineas = [];
  let lineaActual = '';
  let idx = 0;

  // Llenar primera línea
  while (idx < palabras.length) {
    const prueba = lineaActual ? `${lineaActual} ${palabras[idx]}` : palabras[idx];
    if (font.widthOfTextAtSize(prueba, fontSize) <= anchoPrimeraLinea) {
      lineaActual = prueba;
      idx++;
    } else {
      break;
    }
  }
  if (lineaActual) {
    lineas.push(lineaActual);
    lineaActual = '';
  }

  // Llenar líneas subsecuentes con el ancho completo
  while (idx < palabras.length) {
    const prueba = lineaActual ? `${lineaActual} ${palabras[idx]}` : palabras[idx];
    if (font.widthOfTextAtSize(prueba, fontSize) <= anchoLineasSiguientes) {
      lineaActual = prueba;
      idx++;
    } else {
      if (lineaActual) lineas.push(lineaActual);
      lineaActual = palabras[idx];
      idx++;
    }
  }
  if (lineaActual) lineas.push(lineaActual);
  return lineas;
}

/**
 * Convierte un archivo .docx generado a un PDF legal altamente estructurado
 * utilizando pdf-lib en memoria pura.
 */
async function generarPdfDesdeDocx(docxPath, pdfPath, codigo = 'CASO-DOC') {
  if (!fs.existsSync(docxPath)) {
    throw new Error(`No se encontró el archivo docx fuente: ${docxPath}`);
  }

  const zip = new PizZip(fs.readFileSync(docxPath));
  const xml = zip.file('word/document.xml')?.asText() || '';
  const paragraphs = xml.match(/<w:p(?:\s[^>]*)?>.*?<\/w:p>/gs) || [];

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // Dimensiones Carta
  const PAGE_WIDTH = 612;
  const PAGE_HEIGHT = 792;
  const MARGIN_LEFT = 54;
  const MARGIN_RIGHT = 54;
  const MARGIN_TOP = 64;
  const MARGIN_BOTTOM = 54;
  const USABLE_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;

  const colorVerde = rgb(27 / 255, 67 / 255, 44 / 255); // #1B432C
  const colorTexto = rgb(31 / 255, 41 / 255, 55 / 255); // #1F2937
  const colorBorde = rgb(209 / 255, 213 / 255, 219 / 255); // #D1D5DB
  const colorMuted = rgb(107 / 255, 114 / 255, 128 / 255); // #6B7280

  let pages = [];
  let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  pages.push(currentPage);
  let y = PAGE_HEIGHT - MARGIN_TOP;

  function agregarNuevaPagina() {
    currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    pages.push(currentPage);
    y = PAGE_HEIGHT - MARGIN_TOP;
  }

  function verificarEspacio(altoRequerido) {
    if (y - altoRequerido < MARGIN_BOTTOM) {
      agregarNuevaPagina();
    }
  }

  for (const p of paragraphs) {
    const runs = p.match(/<w:r(?:\s[^>]*)?>.*?<\/w:r>/gs) || [];
    const textRuns = [];
    runs.forEach((r) => {
      const isBold = r.includes('<w:b/>') || r.includes('<w:b ');
      const textMatch = r.match(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g) || [];
      const t = textMatch.map((tm) => tm.replace(/<[^>]+>/g, '')).join('');
      if (t) textRuns.push({ text: t, bold: isBold });
    });

    // Concatenar directamente los fragmentos de texto para no añadir espacios espurios antes de los puntos
    let fullText = textRuns
      .map((r) => r.text)
      .join('')
      .replace(/\s+/g, ' ')
      .replace(/\s+\./g, '.')
      .replace(/\.\.+/g, '.')
      .trim();

    if (!fullText) {
      y -= 6;
      continue;
    }

    // 1. Encabezados de sección principales (HECHOS, PRETENSIONES, etc.)
    const isSectionHeading =
      /^(?:[0-9IVXLCDM]+\.\s*)?(?:HECHOS|PRETENSIONES|PETICIONES|FUNDAMENTOS Y RAZONES DE DERECHO|FUNDAMENTOS DE DERECHO|COMPETENCIA|MANIFESTACI[OÓ]N BAJO JURAMENTO|JURAMENTO|NOTIFICACIONES|PRUEBAS Y ANEXOS)\b/i.test(
        fullText
      );

    if (isSectionHeading) {
      verificarEspacio(40);
      y -= 16;

      currentPage.drawText(fullText.toUpperCase(), {
        x: MARGIN_LEFT,
        y,
        size: 11,
        font: fontBold,
        color: colorVerde,
      });

      // Línea sutil decorativa bajo el encabezado
      currentPage.drawLine({
        start: { x: MARGIN_LEFT, y: y - 4 },
        end: { x: MARGIN_LEFT + USABLE_WIDTH, y: y - 4 },
        thickness: 0.8,
        color: colorBorde,
      });

      y -= 16;
      continue;
    }

    // 2. Subsecciones de notificación / partes
    const isSubHeading =
      /^(?:PARTE ACCIONADA|PARTE ACCIONANTE|ACCIONANTE|ACCIONADO|DESTINATARIO|PETICIONARIO):/i.test(
        fullText
      );
    if (isSubHeading && fullText.length < 35) {
      verificarEspacio(26);
      y -= 10;
      currentPage.drawText(fullText.toUpperCase(), {
        x: MARGIN_LEFT,
        y,
        size: 10,
        font: fontBold,
        color: colorVerde,
      });
      y -= 13;
      continue;
    }

    // 3. Párrafo que inicia con número u ordinal en negrilla (PRIMERO., SEGUNDA., 1., etc.)
    const ordinalMatch = fullText.match(
      /^((?:PRIMER[OA]|SEGUND[OA]|TERCER[OA]|CUART[OA]|QUINT[OA]|SEXT[OA]|S[EÉ]PTIM[OA]|OCTAV[OA]|NOVEN[OA]|D[EÉ]CIM[OA](?:\s+PRIMER[OA]|\s+SEGUND[OA])?|[0-9]+\.)\s*)([\s\S]*)$/i
    );

    if (ordinalMatch) {
      const rawPrefix = ordinalMatch[1];
      const prefix = rawPrefix.replace(/\s+\./g, '.').trim() + ' ';
      const rest = ordinalMatch[2].replace(/\.\.+/g, '.').trim();
      const prefixWidth = fontBold.widthOfTextAtSize(prefix, 9.5);

      // La primera línea va a continuación del prefijo, y las siguientes ocupan el margen completo
      const lineas = dividirTextoEnLineasConPrefijo(
        rest,
        fontRegular,
        9.5,
        USABLE_WIDTH - prefixWidth - 2,
        USABLE_WIDTH
      );

      verificarEspacio((lineas.length || 1) * 13.5 + 8);

      // Dibujar prefijo en negrilla (ej: "PRIMERO. ")
      currentPage.drawText(prefix, {
        x: MARGIN_LEFT,
        y,
        size: 9.5,
        font: fontBold,
        color: colorTexto,
      });

      // Dibujar primera línea
      if (lineas.length > 0) {
        currentPage.drawText(lineas[0], {
          x: MARGIN_LEFT + prefixWidth,
          y,
          size: 9.5,
          font: fontRegular,
          color: colorTexto,
        });
        y -= 13.5;

        // Dibujar líneas siguientes alineadas al margen completo (párrafo armónico)
        for (let i = 1; i < lineas.length; i++) {
          verificarEspacio(13.5);
          currentPage.drawText(lineas[i], {
            x: MARGIN_LEFT,
            y,
            size: 9.5,
            font: fontRegular,
            color: colorTexto,
          });
          y -= 13.5;
        }
      } else {
        y -= 13.5;
      }
      y -= 6; // Espacio entre cada hecho o pretensión para lectura estructurada
      continue;
    }

    // 4. Metadatos de cabecera con dos puntos (REFERENCIA:, ACCIONANTE:, etc.)
    const isReference =
      /^(?:REFERENCIA|ACCIONANTE|ACCIONADO|PETICIONARIO|DESTINATARIO|ASUNTO|EXPEDIENTE|PREDIO):/i.test(
        fullText
      );
    if (isReference) {
      const colonIdx = fullText.indexOf(':');
      const label = fullText.slice(0, colonIdx + 1).replace(/\s+/g, ' ').trim() + ' ';
      const val = fullText.slice(colonIdx + 1).replace(/\s+/g, ' ').trim();

      const labelWidth = fontBold.widthOfTextAtSize(label, 9.5);
      const lineas = dividirTextoEnLineasConPrefijo(
        val,
        fontRegular,
        9.5,
        USABLE_WIDTH - labelWidth - 2,
        USABLE_WIDTH
      );

      verificarEspacio((lineas.length || 1) * 13 + 5);

      currentPage.drawText(label, {
        x: MARGIN_LEFT,
        y,
        size: 9.5,
        font: fontBold,
        color: colorVerde,
      });

      if (lineas.length > 0) {
        currentPage.drawText(lineas[0], {
          x: MARGIN_LEFT + labelWidth,
          y,
          size: 9.5,
          font: fontRegular,
          color: colorTexto,
        });
        y -= 13;
        for (let i = 1; i < lineas.length; i++) {
          verificarEspacio(13);
          currentPage.drawText(lineas[i], {
            x: MARGIN_LEFT,
            y,
            size: 9.5,
            font: fontRegular,
            color: colorTexto,
          });
          y -= 13;
        }
      } else {
        y -= 13;
      }
      y -= 4;
      continue;
    }

    // 5. Títulos principales o llamadas judiciales (JUEZ CONSTITUCIONAL...)
    const isMainTitle =
      /^(?:ACCI[OÓ]N DE TUTELA|DERECHO DE PETICI[OÓ]N|JUEZ CONSTITUCIONAL|SEÑOR\(A\)|SEÑORES)/i.test(
        fullText
      );
    const pFont = isMainTitle ? fontBold : fontRegular;
    const pSize = isMainTitle ? 10 : 9.5;
    const lineas = dividirTextoEnLineas(fullText, pFont, pSize, USABLE_WIDTH);

    verificarEspacio(lineas.length * 13 + 4);

    for (const linea of lineas) {
      currentPage.drawText(linea, {
        x: MARGIN_LEFT,
        y,
        size: pSize,
        font: pFont,
        color: isMainTitle ? colorVerde : colorTexto,
      });
      y -= 13;
    }
    y -= 3;
  }

  // Dibujar membrete y pie de página en cada página creada
  const totalPages = pages.length;
  for (let idx = 0; idx < totalPages; idx++) {
    const page = pages[idx];

    // Encabezado institucional
    page.drawLine({
      start: { x: MARGIN_LEFT, y: PAGE_HEIGHT - 38 },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: PAGE_HEIGHT - 38 },
      thickness: 1,
      color: colorVerde,
    });
    page.drawText('JUSTICIA EN TU VEREDA • CONSULTORIO JURÍDICO RURAL', {
      x: MARGIN_LEFT,
      y: PAGE_HEIGHT - 32,
      size: 8,
      font: fontBold,
      color: colorVerde,
    });
    const codText = `RADICADO: ${codigo}`;
    const codWidth = fontBold.widthOfTextAtSize(codText, 8);
    page.drawText(codText, {
      x: PAGE_WIDTH - MARGIN_RIGHT - codWidth,
      y: PAGE_HEIGHT - 32,
      size: 8,
      font: fontBold,
      color: colorTexto,
    });

    // Pie de página oficial
    page.drawLine({
      start: { x: MARGIN_LEFT, y: 38 },
      end: { x: PAGE_WIDTH - MARGIN_RIGHT, y: 38 },
      thickness: 0.5,
      color: colorBorde,
    });
    page.drawText(
      'Documento legal estructurado conforme a la Constitución Política y normativa colombiana',
      {
        x: MARGIN_LEFT,
        y: 26,
        size: 7.5,
        font: fontOblique,
        color: colorMuted,
      }
    );
    const paginacion = `Página ${idx + 1} de ${totalPages}`;
    const pagWidth = fontRegular.widthOfTextAtSize(paginacion, 7.5);
    page.drawText(paginacion, {
      x: PAGE_WIDTH - MARGIN_RIGHT - pagWidth,
      y: 26,
      size: 7.5,
      font: fontRegular,
      color: colorMuted,
    });
  }

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(pdfPath, pdfBytes);
  return {
    pdfPath,
    totalPages,
    bytes: pdfBytes.length,
  };
}

module.exports = {
  generarPdfDesdeDocx,
  dividirTextoEnLineas,
};
