import { describe, expect, it } from "vitest";
import { dividirLote } from "@/lib/offline/sync";
import { estadoPreliminar, horaActualLocal } from "@/lib/offline/preliminar";

describe("dividirLote", () => {
  it("parte en lotes de 200", () => {
    const eventos = Array.from({ length: 450 }, (_, i) => i);
    const lotes = dividirLote(eventos);
    expect(lotes).toHaveLength(3);
    expect(lotes[0]).toHaveLength(200);
    expect(lotes[2]).toHaveLength(50);
  });

  it("devuelve un lote vacío si no hay eventos", () => {
    expect(dividirLote([])).toEqual([]);
  });

  it("respeta un tamaño personalizado", () => {
    expect(dividirLote([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});

describe("estadoPreliminar", () => {
  it("marca puntual con una tolerancia amplia", () => {
    expect(estadoPreliminar("00:00", 1439)).toBe("puntual");
  });

  it("marca tardanza cuando la entrada fue a las 00:00 y ya es más tarde", () => {
    expect(estadoPreliminar("00:00", 0)).toBe("tardanza");
  });

  it("genera una hora local en formato HH:MM", () => {
    expect(horaActualLocal()).toMatch(/^\d{2}:\d{2}$/);
  });
});
