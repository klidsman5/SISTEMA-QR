import { NextResponse } from "next/server";
import { getPerfilActual } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const perfil = await getPerfilActual();
  if (!perfil || !["administrador", "auxiliar_puerta", "docente"].includes(perfil.rol)) {
    return NextResponse.json({ error: { code: "SIN_PERMISO", message: "Sin acceso" } }, { status: 403 });
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("credenciales")
    .select("qr_uuid, alumno_id, alumnos(nombres, apellidos, grado_id, seccion_id)")
    .eq("estado", "vigente")
    .limit(2000);

  if (error) {
    return NextResponse.json({ error: { code: "VALIDACION", message: error.message } }, { status: 422 });
  }

  const [{ data: grados }, { data: secciones }] = await Promise.all([
    supabase.from("grados").select("id, nombre, hora_entrada, tolerancia_min"),
    supabase.from("secciones").select("id, nombre"),
  ]);

  const gradoPorId = new Map((grados ?? []).map((g) => [g.id, g]));
  const seccionPorId = new Map((secciones ?? []).map((s) => [s.id, s]));

  const filas = (data ?? []).flatMap((c) => {
    const alumno = Array.isArray(c.alumnos) ? c.alumnos[0] : c.alumnos;
    if (!alumno) return [];
    const grado = gradoPorId.get(alumno.grado_id);
    const seccion = seccionPorId.get(alumno.seccion_id);

    return [{
      qr_uuid: c.qr_uuid,
      alumno_id: c.alumno_id,
      nombre: `${alumno.nombres} ${alumno.apellidos}`,
      grado: grado?.nombre ?? "",
      seccion: seccion?.nombre ?? "",
      hora_entrada: (grado?.hora_entrada ?? "07:30").slice(0, 5),
      tolerancia_min: grado?.tolerancia_min ?? 10,
    }];
  });

  return NextResponse.json({ data: filas });
}
