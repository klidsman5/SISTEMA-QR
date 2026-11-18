import { describe, expect, it } from "vitest";
import { justificacionCreateSchema, reversionSchema } from "@/features/justificaciones/schema";

describe("justificacionCreateSchema", () => {
  const base = {
    dni: "70123456",
    tipo: "posterior" as const,
    nivel: "ambos" as const,
    fecha: "2026-11-17",
    motivo: "Cita médica",
    observacion: "Certificado presentado",
  };

  it("acepta una justificación completa", () => {
    expect(justificacionCreateSchema.safeParse(base).success).toBe(true);
  });

  it("exige motivo y observación", () => {
    expect(justificacionCreateSchema.safeParse({ ...base, motivo: "" }).success).toBe(false);
    expect(justificacionCreateSchema.safeParse({ ...base, observacion: " " }).success).toBe(false);
  });

  it("exige alumno por DNI o id", () => {
    expect(justificacionCreateSchema.safeParse({ ...base, dni: undefined }).success).toBe(false);
  });

  it("exige fecha ISO corta", () => {
    expect(justificacionCreateSchema.safeParse({ ...base, fecha: "17/11/2026" }).success).toBe(false);
  });

  it("rechaza niveles desconocidos", () => {
    expect(justificacionCreateSchema.safeParse({ ...base, nivel: "curso" }).success).toBe(false);
  });
});

describe("reversionSchema", () => {
  it("exige un motivo de al menos 3 caracteres", () => {
    expect(reversionSchema.safeParse({ motivo: "ok" }).success).toBe(false);
    expect(reversionSchema.safeParse({ motivo: "Error de captura" }).success).toBe(true);
  });
});
