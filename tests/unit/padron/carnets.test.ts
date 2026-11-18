import { describe, expect, it } from "vitest";
import { armarCarnets } from "@/features/admin/padron/carnets";

const grados = [{ id: "g1", nombre: "3ro" }];
const secciones = [{ id: "s1", nombre: "B" }];

const alumnos = [
  {
    id: "a1",
    dni: "70123456",
    nombres: "Ana Lucía",
    apellidos: "Torres Ríos",
    grado_id: "g1",
    seccion_id: "s1",
  },
  {
    id: "a2",
    dni: "70123457",
    nombres: "Luis",
    apellidos: "Quispe",
    grado_id: "g1",
    seccion_id: "s1",
  },
];

describe("armarCarnets", () => {
  it("incluye sólo alumnos con credencial vigente", () => {
    const carnets = armarCarnets(alumnos, grados, secciones, [
      { alumno_id: "a1", qr_uuid: "qr-1", estado: "vigente" },
      { alumno_id: "a2", qr_uuid: "qr-2", estado: "revocada" },
    ]);

    expect(carnets).toHaveLength(1);
    expect(carnets[0]).toMatchObject({
      nombre: "Ana Lucía Torres Ríos",
      dni: "70123456",
      grado: "3ro",
      seccion: "B",
      qrUuid: "qr-1",
    });
  });

  it("no duplica carnets si hay dos credenciales vigentes", () => {
    const carnets = armarCarnets(alumnos, grados, secciones, [
      { alumno_id: "a1", qr_uuid: "qr-1", estado: "vigente" },
      { alumno_id: "a1", qr_uuid: "qr-2", estado: "vigente" },
    ]);

    expect(carnets).toHaveLength(1);
  });

  it("devuelve lista vacía si no hay credenciales", () => {
    expect(armarCarnets(alumnos, grados, secciones, [])).toEqual([]);
  });
});
