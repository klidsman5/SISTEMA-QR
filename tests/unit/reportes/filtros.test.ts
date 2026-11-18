import { describe, expect, it } from "vitest";
import { filtrosDesdeParams, porcentaje, rangoPorDefecto } from "@/features/reportes/filters";

describe("filtrosDesdeParams", () => {
  it("lee filtros válidos", () => {
    const params = new URLSearchParams({
      desde: "2026-11-01",
      hasta: "2026-11-30",
      nivel: "aula",
      estado: "falta",
    });

    expect(filtrosDesdeParams(params)).toEqual({
      desde: "2026-11-01",
      hasta: "2026-11-30",
      nivel: "aula",
      estado: "falta",
    });
  });

  it("descarta valores inválidos sin romper la consulta", () => {
    const params = new URLSearchParams({ nivel: "curso", estado: "otro", desde: "17/11/2026" });
    expect(filtrosDesdeParams(params)).toEqual({});
  });
});

describe("porcentaje", () => {
  it("calcula con un decimal", () => {
    expect(porcentaje(1, 3)).toBe(33.3);
    expect(porcentaje(2, 3)).toBe(66.7);
  });

  it("devuelve 0 si no hay registros", () => {
    expect(porcentaje(0, 0)).toBe(0);
  });
});

describe("rangoPorDefecto", () => {
  it("devuelve un rango de 30 días", () => {
    const { desde, hasta } = rangoPorDefecto();
    const dias = (new Date(hasta).getTime() - new Date(desde).getTime()) / 86_400_000;
    expect(Math.round(dias)).toBe(29);
  });
});
