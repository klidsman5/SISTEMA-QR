import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { generarQrPng } from "@/lib/qr/generator";

export interface CarnetAlumno {
  nombre: string;
  dni: string;
  grado: string;
  seccion: string;
  qrUuid: string;
}

const A4 = { width: 595.28, height: 841.89 };
const MARGEN = 30;
const COLUMNAS = 2;
const FILAS = 5;

export async function generarCarnets(alumnos: CarnetAlumno[]): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fuente = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);

  const porPagina = COLUMNAS * FILAS;
  const anchoCarnet = (A4.width - MARGEN * (COLUMNAS + 1)) / COLUMNAS;
  const altoCarnet = (A4.height - MARGEN * (FILAS + 1)) / FILAS;

  for (let inicio = 0; inicio < alumnos.length; inicio += porPagina) {
    const pagina = pdf.addPage([A4.width, A4.height]);
    const lote = alumnos.slice(inicio, inicio + porPagina);

    for (let i = 0; i < lote.length; i += 1) {
      const alumno = lote[i];
      const col = i % COLUMNAS;
      const fila = Math.floor(i / COLUMNAS);
      const x = MARGEN + col * (anchoCarnet + MARGEN);
      const y = A4.height - MARGEN - (fila + 1) * altoCarnet - fila * MARGEN;

      pagina.drawRectangle({
        x,
        y,
        width: anchoCarnet,
        height: altoCarnet,
        borderColor: rgb(0.42, 0.39, 0.85),
        borderWidth: 1,
        color: rgb(1, 1, 1),
      });

      pagina.drawRectangle({
        x,
        y: y + altoCarnet - 26,
        width: anchoCarnet,
        height: 26,
        color: rgb(0.31, 0.27, 0.9),
      });

      pagina.drawText("ASISTENCIA QR", {
        x: x + 10,
        y: y + altoCarnet - 18,
        size: 9,
        font: negrita,
        color: rgb(1, 1, 1),
      });

      const qrPng = await generarQrPng(alumno.qrUuid);
      const qrImagen = await pdf.embedPng(qrPng);
      const qrTamano = 74;

      pagina.drawImage(qrImagen, {
        x: x + anchoCarnet - qrTamano - 10,
        y: y + 12,
        width: qrTamano,
        height: qrTamano,
      });

      const textoX = x + 10;
      pagina.drawText(alumno.nombre.slice(0, 28), {
        x: textoX,
        y: y + altoCarnet - 48,
        size: 10,
        font: negrita,
        color: rgb(0.1, 0.1, 0.2),
      });

      pagina.drawText(`DNI: ${alumno.dni}`, {
        x: textoX,
        y: y + altoCarnet - 66,
        size: 8,
        font: fuente,
        color: rgb(0.3, 0.3, 0.4),
      });

      pagina.drawText(`${alumno.grado} ${alumno.seccion}`, {
        x: textoX,
        y: y + altoCarnet - 82,
        size: 8,
        font: fuente,
        color: rgb(0.3, 0.3, 0.4),
      });

      pagina.drawText("Credencial personal. No compartir.", {
        x: x + 10,
        y: y + 10,
        size: 5.5,
        font: fuente,
        color: rgb(0.5, 0.5, 0.6),
      });
    }
  }

  return pdf.save();
}
