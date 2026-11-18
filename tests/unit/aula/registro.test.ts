import { describe, expect, it } from "vitest";
import { estadoAula, puedeRegistrarEnSesion } from "@/features/aula/rules";

const SECCION = "sec-b";
const OTRA = "sec-a";

describe("estadoAula", () => {
  it("marca puntual dentro de la tolerancia de la sesión", () => {
    expect(estadoAula("08:05", "08:00", 5)).toBe("puntual");
  });

  it("marca tardanza después de la tolerancia", () => {
    expect(estadoAula("08:06", "08:00", 5)).toBe("tardanza");
  });
});

describe("puedeRegistrarEnSesion", () => {
  it("acepta un alumno de la sección en sesión abierta", () => {
    expect(
      puedeRegistrarEnSesion({ alumnoSeccionId: SECCION, cursoSeccionId: SECCION, sesionAbierta: true }),
    ).toEqual({ ok: true });
  });

  it("rechaza un alumno de otra sección", () => {
    expect(
      puedeRegistrarEnSesion({ alumnoSeccionId: OTRA, cursoSeccionId: SECCION, sesionAbierta: true }),
    ).toEqual({ ok: false, motivo: "fuera_de_seccion" });
  });

  it("rechaza el registro en una sesión cerrada", () => {
    expect(
      puedeRegistrarEnSesion({ alumnoSeccionId: SECCION, cursoSeccionId: SECCION, sesionAbierta: false }),
    ).toEqual({ ok: false, motivo: "sesion_cerrada" });
  });
});
