import { describe, expect, it } from "vitest";
import { bloquesSeSolapan } from "@/lib/rules/solapamiento";
import { finDeBloque } from "@/lib/rules/horario";

describe("SC-008: solapamiento con la duración configurada", () => {
  it("dos cursos de 45 y 60 minutos a las 08:00 solapan", () => {
    expect(bloquesSeSolapan({ horaInicio: "08:00", duracionMin: 45 }, { horaInicio: "08:30", duracionMin: 60 })).toBe(
      true,
    );
  });

  it("el mismo par sin solape cuando la duración se reduce a 20 minutos", () => {
    expect(bloquesSeSolapan({ horaInicio: "08:00", duracionMin: 20 }, { horaInicio: "08:30", duracionMin: 20 })).toBe(
      false,
    );
  });

  it("el fin del bloque refleja la duración configurada", () => {
    expect(finDeBloque("08:00", 45)).toBe("08:45");
    expect(finDeBloque("08:00", 60)).toBe("09:00");
  });
});
