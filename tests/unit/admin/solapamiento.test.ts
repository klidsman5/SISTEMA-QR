import { describe, expect, it } from "vitest";
import { bloquesSeSolapan, haySolapamiento } from "@/lib/rules/solapamiento";

describe("bloquesSeSolapan", () => {
  it("detecta solapamiento parcial", () => {
    expect(bloquesSeSolapan({ horaInicio: "08:00", duracionMin: 45 }, { horaInicio: "08:30", duracionMin: 45 })).toBe(
      true,
    );
  });

  it("no considera solapamiento cuando un bloque termina justo al iniciar el otro", () => {
    expect(bloquesSeSolapan({ horaInicio: "08:00", duracionMin: 45 }, { horaInicio: "08:45", duracionMin: 45 })).toBe(
      false,
    );
  });

  it("detecta bloque contenido en otro", () => {
    expect(bloquesSeSolapan({ horaInicio: "08:00", duracionMin: 90 }, { horaInicio: "08:20", duracionMin: 30 })).toBe(
      true,
    );
  });

  it("no solapa bloques separados", () => {
    expect(bloquesSeSolapan({ horaInicio: "08:00", duracionMin: 45 }, { horaInicio: "10:00", duracionMin: 45 })).toBe(
      false,
    );
  });
});

describe("haySolapamiento", () => {
  it("detecta cualquier par en una lista", () => {
    expect(
      haySolapamiento([
        { horaInicio: "08:00", duracionMin: 45 },
        { horaInicio: "09:00", duracionMin: 45 },
        { horaInicio: "09:30", duracionMin: 45 },
      ]),
    ).toBe(true);
  });

  it("devuelve false con bloques consecutivos", () => {
    expect(
      haySolapamiento([
        { horaInicio: "08:00", duracionMin: 45 },
        { horaInicio: "08:45", duracionMin: 45 },
      ]),
    ).toBe(false);
  });
});
