import type { CarnetAlumno } from "@/lib/export/pdf";

export interface AlumnoCarnet {
  id: string;
  dni: string;
  nombres: string;
  apellidos: string;
  grado_id: string;
  seccion_id: string;
}

export interface CredencialCarnet {
  alumno_id: string;
  qr_uuid: string;
  estado: string;
}

export function armarCarnets(
  alumnos: AlumnoCarnet[],
  grados: Array<{ id: string; nombre: string }>,
  secciones: Array<{ id: string; nombre: string }>,
  credenciales: CredencialCarnet[],
): CarnetAlumno[] {
  const nombreGrado = new Map(grados.map((g) => [g.id, g.nombre]));
  const nombreSeccion = new Map(secciones.map((s) => [s.id, s.nombre]));
  const qrVigente = new Map(
    credenciales.filter((c) => c.estado === "vigente").map((c) => [c.alumno_id, c.qr_uuid]),
  );

  return alumnos
    .filter((a) => qrVigente.has(a.id))
    .map((a) => ({
      nombre: `${a.nombres} ${a.apellidos}`,
      dni: a.dni,
      grado: nombreGrado.get(a.grado_id) ?? "",
      seccion: nombreSeccion.get(a.seccion_id) ?? "",
      qrUuid: qrVigente.get(a.id)!,
    }));
}
