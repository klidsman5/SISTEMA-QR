import { describe, expect, it } from "vitest";
import { bloqueValido, calcularEstado, finDeBloque, horaAMinutos, minutosAHora } from "@/lib/rules/horario";

describe("horaAMinutos", () => {
  it("convierte horas válidas", () => {
    expect(horaAMinutos("07:30")).toBe(450);
    expect(minutosAHora(450)).toBe("07:30");
  });

  it("rechaza horas inválidas", () => {
    expect(() => horaAMinutos("24:00")).toThrow();
    expect(() => horaAMinutos("07:99")).toThrow();
  });
});

describe("calcularEstado", () => {
  it("marca puntual justo en el límite de tolerancia", () => {
    expect(calcularEstado("07:40", "07:30", 10)).toBe("puntual");
  });

  it("marca tardanza un minuto después del límite", () => {
    expect(calcularEstado("07:41", "07:30", 10)).toBe("tardanza");
  });

  it("marca tardanza cuando la hora es anterior por error del reloj", () => {
    expect(calcularEstado("07:00", "07:30", 0)).toBe("puntual");
  });
});

describe("bloques", () => {
  it("calcula el fin de bloque", () => {
    expect(finDeBloque("08:00", 45)).toBe("08:45");
  });

  it("no permite bloques que terminen después de medianoche", () => {
    expect(bloqueValido("23:30", 60)).toBe(false);
    expect(bloqueValido("22:00", 60)).toBe(true);
  });
});
