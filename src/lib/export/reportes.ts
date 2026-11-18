import ExcelJS from "exceljs";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export interface FilaReporte {
  fecha: string;
  hora: string;
  alumno: string;
  dni: string;
  grado: string;
  seccion: string;
  curso: string;
  nivel: string;
  estado: string;
  origen: string;
}

const COLUMNAS: Array<{ clave: keyof FilaReporte; titulo: string }> = [
  { clave: "fecha", titulo: "Fecha" },
  { clave: "hora", titulo: "Hora" },
  { clave: "alumno", titulo: "Alumno" },
  { clave: "dni", titulo: "DNI" },
  { clave: "grado", titulo: "Grado" },
  { clave: "seccion", titulo: "Sección" },
  { clave: "curso", titulo: "Curso" },
  { clave: "nivel", titulo: "Nivel" },
  { clave: "estado", titulo: "Estado" },
  { clave: "origen", titulo: "Origen" },
];

export async function generarXlsx(filas: FilaReporte[]): Promise<Buffer> {
  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Asistencia");
  hoja.addRow(COLUMNAS.map((c) => c.titulo));
  hoja.getRow(1).font = { bold: true };
  filas.forEach((f) => hoja.addRow(COLUMNAS.map((c) => f[c.clave])));
  hoja.columns.forEach((col) => {
    col.width = 16;
  });
  return Buffer.from(await libro.xlsx.writeBuffer());
}

export async function generarPdf(filas: FilaReporte[], titulo: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fuente = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);

  const porPagina = 32;
  for (let inicio = 0; inicio < Math.max(filas.length, 1); inicio += porPagina) {
    const pagina = pdf.addPage([842, 595]); // A4 horizontal
    pagina.drawText(titulo, { x: 30, y: 560, size: 12, font: negrita });
    pagina.drawText(`Generado: ${new Date().toLocaleString("es-PE")}`, {
      x: 30, y: 545, size: 7, font: fuente, color: rgb(0.4, 0.4, 0.4),
    });

    const lote = filas.slice(inicio, inicio + porPagina);
    let y = 520;
    pagina.drawText("Fecha      Hora    Alumno                          Grado Sec  Nivel   Estado", {
      x: 30, y, size: 7, font: negrita,
    });
    y -= 12;

    for (const f of lote) {
      const linea = [
        f.fecha,
        f.hora.slice(0, 5),
        `${f.alumno}`.slice(0, 30).padEnd(31, " "),
        (f.grado || "").slice(0, 5).padEnd(5, " "),
        (f.seccion || "").slice(0, 3).padEnd(4, " "),
        f.nivel.padEnd(8, " "),
        f.estado,
      ].join(" ");
      pagina.drawText(linea, { x: 30, y, size: 7, font: fuente });
      y -= 14;
    }
  }

  return pdf.save();
}
