import { describe, expect, it } from "vitest";
import { cerrarJornadaSchema, registrarEntradaSchema } from "@/features/puerta/schema";

const UUID = "11111111-1111-4111-8111-111111111111";

describe("registrarEntradaSchema", () => {
  it("acepta un escaneo con QR", () => {
    const parsed = registrarEntradaSchema.safeParse({ qr_uuid: UUID, origen: "escaneo" });
    expect(parsed.success).toBe(true);
  });

  it("acepta un registro manual con DNI y motivo", () => {
    const parsed = registrarEntradaSchema.safeParse({
      dni: "70123456",
      motivo: "Credencial olvidada",
      origen: "manual",
    });
    expect(parsed.success).toBe(true);
  });

  it("rechaza el registro manual sin motivo", () => {
    const parsed = registrarEntradaSchema.safeParse({ dni: "70123456", origen: "manual" });
    expect(parsed.success).toBe(false);
  });

  it("rechaza un payload sin QR, alumno ni DNI", () => {
    const parsed = registrarEntradaSchema.safeParse({ origen: "escaneo" });
    expect(parsed.success).toBe(false);
  });

  it("rechaza un QR que no es uuid", () => {
    const parsed = registrarEntradaSchema.safeParse({ qr_uuid: "abc", origen: "escaneo" });
    expect(parsed.success).toBe(false);
  });
});

describe("cerrarJornadaSchema", () => {
  it("exige fecha ISO corta", () => {
    expect(cerrarJornadaSchema.safeParse({ turno_id: UUID, fecha: "2026-11-17" }).success).toBe(true);
    expect(cerrarJornadaSchema.safeParse({ turno_id: UUID, fecha: "17/11/2026" }).success).toBe(false);
  });
});
