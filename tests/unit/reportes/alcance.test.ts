import { describe, expect, it } from "vitest";
import { forzarAlcanceRol } from "@/features/reportes/filters";

describe("forzarAlcanceRol", () => {
  it("fuerza nivel aula para el Docente aunque pida puerta", () => {
    expect(forzarAlcanceRol({ nivel: "puerta" }, "docente").nivel).toBe("aula");
  });

  it("fuerza nivel aula cuando el Docente no envía nivel", () => {
    expect(forzarAlcanceRol({}, "docente").nivel).toBe("aula");
  });

  it("fuerza nivel puerta para el Auxiliar aunque pida aula", () => {
    expect(forzarAlcanceRol({ nivel: "aula" }, "auxiliar_puerta").nivel).toBe("puerta");
  });

  it("respeta el nivel elegido por el Administrador", () => {
    expect(forzarAlcanceRol({ nivel: "aula" }, "administrador").nivel).toBe("aula");
    expect(forzarAlcanceRol({}, "administrador").nivel).toBeUndefined();
  });
});
