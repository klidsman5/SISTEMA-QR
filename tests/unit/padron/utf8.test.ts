import { describe, expect, it } from "vitest";
import { normalizarColumna, parsearArchivo } from "@/features/admin/padron/parser";

describe("normalizarColumna", () => {
  it("quita acentos, espacios y mayúsculas", () => {
    expect(normalizarColumna("  Fecha Nacimiento ")).toBe("fecha_nacimiento");
    expect(normalizarColumna("Sección")).toBe("seccion");
    expect(normalizarColumna("Año")).toBe("ano");
  });
});

describe("parsearArchivo CSV", () => {
  it("lee acentos y BOM sin perder caracteres", async () => {
    const contenido = "\uFEFFdni,nombres,apellidos,grado,seccion\n70123456,Ana Lucía,Torres Ríos,3ro,B\n";
    const archivo = new File([contenido], "padron_acentos_utf8.csv", { type: "text/csv" });

    const filas = await parsearArchivo(archivo);

    expect(filas).toHaveLength(1);
    expect(filas[0].nombres).toBe("Ana Lucía");
    expect(filas[0].apellidos).toBe("Torres Ríos");
    expect(filas[0].grado).toBe("3ro");
  });

  it("rechaza un formato desconocido", async () => {
    const archivo = new File(["x"], "padron.txt", { type: "text/plain" });
    await expect(parsearArchivo(archivo)).rejects.toThrow(/Formato no soportado/);
  });
});
