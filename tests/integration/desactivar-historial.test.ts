import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const acciones = [
  "src/features/admin/estructura/actions.ts",
  "src/features/admin/cursos/actions.ts",
  "src/features/admin/usuarios/actions.ts",
];

describe("FR-011: desactivar conserva el historial", () => {
  it.each(acciones)("%s no elimina filas, sólo cambia el estado", (ruta) => {
    const contenido = readFileSync(resolve(process.cwd(), ruta), "utf8");
    expect(contenido).not.toMatch(/\.delete\(/);
    expect(contenido).toMatch(/activo:\s*false/);
  });
});
