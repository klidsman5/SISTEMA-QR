import ExcelJS from "exceljs";
import Papa from "papaparse";

export interface FilaCruda {
  dni: string;
  nombres: string;
  apellidos: string;
  grado: string;
  seccion: string;
  foto_url: string;
}

const COLUMNAS = ["dni", "nombres", "apellidos", "grado", "seccion"] as const;

export function normalizarColumna(valor: string): string {
  return valor
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

function filaDesdeObjeto(objeto: Record<string, unknown>): FilaCruda {
  const normalizado: Record<string, string> = {};
  for (const [clave, valor] of Object.entries(objeto)) {
    normalizado[normalizarColumna(clave)] = String(valor ?? "").trim();
  }

  return {
    dni: normalizado.dni ?? "",
    nombres: normalizado.nombres ?? "",
    apellidos: normalizado.apellidos ?? "",
    grado: normalizado.grado ?? "",
    seccion: normalizado.seccion ?? "",
    foto_url: normalizado.foto_url ?? "",
  };
}

export function validarColumnas(filas: Record<string, unknown>[]): string[] {
  if (filas.length === 0) return [...COLUMNAS];
  const presentes = new Set(Object.keys(filas[0]).map(normalizarColumna));
  return COLUMNAS.filter((c) => !presentes.has(c));
}

export async function parsearArchivo(archivo: File): Promise<FilaCruda[]> {
  const nombre = archivo.name.toLowerCase();
  const buffer = Buffer.from(await archivo.arrayBuffer());

  if (nombre.endsWith(".csv")) {
    const texto = buffer.toString("utf8").replace(/^\uFEFF/, "");
    const resultado = Papa.parse<Record<string, unknown>>(texto, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
    });

    if (resultado.errors.length > 0) {
      throw new Error(`CSV inválido: ${resultado.errors[0].message}`);
    }

    return (resultado.data ?? []).map(filaDesdeObjeto);
  }

  if (nombre.endsWith(".xlsx")) {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as Parameters<typeof workbook.xlsx.load>[0]);
    const hoja = workbook.worksheets[0];
    if (!hoja) throw new Error("El archivo no tiene hojas");

    const encabezados: string[] = [];
    hoja.getRow(1).eachCell((celda) => encabezados.push(String(celda.value ?? "")));

    const filas: Record<string, unknown>[] = [];
    hoja.eachRow((row, numero) => {
      if (numero === 1) return;
      const objeto: Record<string, unknown> = {};
      encabezados.forEach((encabezado, indice) => {
        objeto[encabezado] = row.getCell(indice + 1).value ?? "";
      });
      filas.push(objeto);
    });

    return filas.map(filaDesdeObjeto);
  }

  throw new Error("Formato no soportado. Usa .csv o .xlsx");
}
