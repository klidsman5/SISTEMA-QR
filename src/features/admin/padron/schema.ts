import { z } from "zod";
import type { FilaCruda } from "./parser";
import type { FilaError, FilaValida } from "./types";

export const anioSchema = z.coerce
  .number()
  .int()
  .min(2000, "Año inválido")
  .max(2100, "Año inválido");

export const dniSchema = z
  .string()
  .trim()
  .min(5, "El DNI es obligatorio")
  .max(20, "El DNI es demasiado largo");

const nombreSchema = z.string().trim().min(2, "El nombre es obligatorio").max(120);

export interface EstructuraAcademica {
  grados: Array<{ id: string; nombre: string }>;
  secciones: Array<{ id: string; grado_id: string; nombre: string }>;
}

const sinAcentos = (v: string) =>
  v.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export function validarFilas(
  filas: FilaCruda[],
  estructura: EstructuraAcademica,
): { validas: FilaValida[]; errores: FilaError[] } {
  const validas: FilaValida[] = [];
  const errores: FilaError[] = [];
  const vistos = new Set<string>();

  filas.forEach((fila, indice) => {
    const numero = indice + 2; // la fila 1 es el encabezado
    const dni = dniSchema.safeParse(fila.dni);
    const nombres = nombreSchema.safeParse(fila.nombres);
    const apellidos = nombreSchema.safeParse(fila.apellidos);

    if (!dni.success) {
      errores.push({ fila: numero, campo: "dni", detalle: dni.error.issues[0].message });
      return;
    }
    if (!nombres.success) {
      errores.push({ fila: numero, campo: "nombres", detalle: nombres.error.issues[0].message });
      return;
    }
    if (!apellidos.success) {
      errores.push({ fila: numero, campo: "apellidos", detalle: apellidos.error.issues[0].message });
      return;
    }

    if (vistos.has(dni.data.toLowerCase())) {
      errores.push({ fila: numero, campo: "dni", detalle: "DNI repetido en el archivo" });
      return;
    }

    const grado = estructura.grados.find((g) => sinAcentos(g.nombre) === sinAcentos(fila.grado));
    if (!grado) {
      errores.push({ fila: numero, campo: "grado", detalle: `Grado no encontrado: ${fila.grado}` });
      return;
    }

    const seccion = estructura.secciones.find(
      (s) => s.grado_id === grado.id && sinAcentos(s.nombre) === sinAcentos(fila.seccion),
    );
    if (!seccion) {
      errores.push({
        fila: numero,
        campo: "seccion",
        detalle: `Sección no encontrada para ${grado.nombre}: ${fila.seccion}`,
      });
      return;
    }

    vistos.add(dni.data.toLowerCase());
    validas.push({
      fila: numero,
      dni: dni.data,
      nombres: nombres.data,
      apellidos: apellidos.data,
      grado_id: grado.id,
      seccion_id: seccion.id,
    });
  });

  return { validas, errores };
}
