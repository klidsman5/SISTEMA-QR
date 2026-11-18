import { describe, expect, it } from "vitest";
import { cursoCreateSchema, gradoCreateSchema, seccionCreateSchema } from "@/features/admin/estructura/schema";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("gradoCreateSchema", () => {
  it("acepta hora en formato 24 h y tolerancia en rango", () => {
    const parsed = gradoCreateSchema.safeParse({
      nombre: "3ro",
      turno_id: UUID,
      hora_entrada: "07:30",
      tolerancia_min: "10",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.tolerancia_min).toBe(10);
  });

  it("rechaza hora inválida y tolerancia fuera de rango", () => {
    expect(
      gradoCreateSchema.safeParse({ nombre: "3ro", turno_id: UUID, hora_entrada: "25:00", tolerancia_min: "10" })
        .success,
    ).toBe(false);
    expect(
      gradoCreateSchema.safeParse({ nombre: "3ro", turno_id: UUID, hora_entrada: "07:30", tolerancia_min: "500" })
        .success,
    ).toBe(false);
  });
});

describe("seccionCreateSchema", () => {
  it("exige un grado existente", () => {
    expect(seccionCreateSchema.safeParse({ grado_id: "", nombre: "A" }).success).toBe(false);
  });
});

describe("cursoCreateSchema", () => {
  it("convierte docente vacío en null", () => {
    const parsed = cursoCreateSchema.safeParse({
      seccion_id: UUID,
      docente_id: "",
      nombre: "Matemática",
      hora_inicio: "08:00",
      duracion_bloque_min: "45",
      tolerancia_min: "5",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.docente_id).toBeNull();
  });

  it("exige duración entre 20 y 180 minutos", () => {
    const base = {
      seccion_id: UUID,
      docente_id: "",
      nombre: "Matemática",
      hora_inicio: "08:00",
      tolerancia_min: "5",
    };
    expect(cursoCreateSchema.safeParse({ ...base, duracion_bloque_min: "10" }).success).toBe(false);
    expect(cursoCreateSchema.safeParse({ ...base, duracion_bloque_min: "200" }).success).toBe(false);
  });
});
