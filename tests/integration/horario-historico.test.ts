import { describe, expect, it } from "vitest";
import { calcularEstado } from "@/lib/rules/horario";

/**
 * FR-014: los registros anteriores conservan el estado calculado con el horario vigente
 * en su momento. El cálculo recibe la regla aplicada, no la configuración actual.
 */
describe("estado congelado del registro histórico", () => {
  it("mantiene tardanza aunque el horario actual sea más permisivo", () => {
    const estadoAlRegistrar = calcularEstado("07:50", "07:30", 10);
    const estadoConHorarioNuevo = calcularEstado("07:50", "08:00", 20);

    expect(estadoAlRegistrar).toBe("tardanza");
    expect(estadoConHorarioNuevo).toBe("puntual");
  });

  it("mantiene puntual aunque el horario actual sea más estricto", () => {
    const estadoAlRegistrar = calcularEstado("07:35", "07:30", 10);
    const estadoConHorarioNuevo = calcularEstado("07:35", "07:30", 0);

    expect(estadoAlRegistrar).toBe("puntual");
    expect(estadoConHorarioNuevo).toBe("tardanza");
  });
});
