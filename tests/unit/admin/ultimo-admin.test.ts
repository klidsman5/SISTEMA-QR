import { describe, expect, it } from "vitest";
import { puedeDesactivar } from "@/features/admin/usuarios/rules";

describe("regla del último Administrador", () => {
  it("no permite desactivar al único Administrador activo", () => {
    expect(puedeDesactivar("administrador", 1)).toBe(false);
  });

  it("permite desactivar un Administrador cuando hay más de uno", () => {
    expect(puedeDesactivar("administrador", 2)).toBe(true);
  });

  it("permite desactivar cuentas que no son Administrador", () => {
    expect(puedeDesactivar("docente", 1)).toBe(true);
    expect(puedeDesactivar("auxiliar_puerta", 1)).toBe(true);
  });
});
