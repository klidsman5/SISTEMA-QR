import { describe, expect, it } from "vitest";
import { validarFilas, type EstructuraAcademica } from "@/features/admin/padron/schema";
import type { FilaCruda } from "@/features/admin/padron/parser";

const GRADO_ID = "11111111-1111-4111-8111-111111111111";
const SECCION_ID = "22222222-2222-4222-8222-222222222222";

const estructura: EstructuraAcademica = {
  grados: [{ id: GRADO_ID, nombre: "3ro" }],
  secciones: [{ id: SECCION_ID, grado_id: GRADO_ID, nombre: "B" }],
};

function fila(overrides: Partial<FilaCruda> = {}): FilaCruda {
  return {
    dni: "70123456",
    nombres: "Ana Lucía",
    apellidos: "Torres Ríos",
    grado: "3ro",
    seccion: "B",
    foto_url: "",
    ...overrides,
  };
}

describe("validarFilas", () => {
  it("acepta una fila completa y resuelve grado y sección", () => {
    const { validas, errores } = validarFilas([fila()], estructura);
    expect(errores).toHaveLength(0);
    expect(validas).toEqual([
      {
        fila: 2,
        dni: "70123456",
        nombres: "Ana Lucía",
        apellidos: "Torres Ríos",
        grado_id: GRADO_ID,
        seccion_id: SECCION_ID,
      },
    ]);
  });

  it("acepta acentos y nombres con tilde", () => {
    const { errores } = validarFilas([fila({ nombres: "José María", apellidos: "Núñez" })], estructura);
    expect(errores).toHaveLength(0);
  });

  it("rechaza una fila sin DNI", () => {
    const { validas, errores } = validarFilas([fila({ dni: "" })], estructura);
    expect(validas).toHaveLength(0);
    expect(errores[0].campo).toBe("dni");
  });

  it("rechaza una fila sin nombres", () => {
    const { errores } = validarFilas([fila({ nombres: "" })], estructura);
    expect(errores[0].campo).toBe("nombres");
  });

  it("rechaza un grado inexistente", () => {
    const { errores } = validarFilas([fila({ grado: "9no" })], estructura);
    expect(errores[0].campo).toBe("grado");
  });

  it("rechaza una sección que no pertenece al grado", () => {
    const { errores } = validarFilas([fila({ seccion: "Z" })], estructura);
    expect(errores[0].campo).toBe("seccion");
  });

  it("detecta DNI repetido dentro del archivo", () => {
    const { validas, errores } = validarFilas([fila(), fila({ nombres: "Otra Persona" })], estructura);
    expect(validas).toHaveLength(1);
    expect(errores[0].detalle).toMatch(/repetido/i);
  });

  it("ignora mayúsculas y tildes al buscar grado y sección", () => {
    const { errores } = validarFilas([fila({ grado: "3RO", seccion: "b" })], estructura);
    expect(errores).toHaveLength(0);
  });
});
