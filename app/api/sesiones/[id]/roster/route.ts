import { NextResponse } from "next/server";
import { getPerfilActual } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const perfil = await getPerfilActual();
  if (!perfil || !["docente", "administrador"].includes(perfil.rol)) {
    return NextResponse.json({ error: { code: "SIN_PERMISO", message: "Sin acceso" } }, { status: 403 });
  }

  const { id } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: sesion } = await supabase
    .from("sesiones_clase")
    .select("id, curso_id, estado, docente_id")
    .eq("id", id)
    .maybeSingle();

  if (!sesion) {
    return NextResponse.json({ error: { code: "VALIDACION", message: "Sesión no encontrada" } }, { status: 404 });
  }

  const { data: curso } = await supabase
    .from("cursos")
    .select("seccion_id, nombre")
    .eq("id", sesion.curso_id)
    .single();

  if (!curso) {
    return NextResponse.json({ error: { code: "VALIDACION", message: "Curso no encontrado" } }, { status: 404 });
  }

  const [{ data: alumnos }, { data: asistencias }] = await Promise.all([
    supabase
      .from("alumnos")
      .select("id, nombres, apellidos, dni")
      .eq("seccion_id", curso.seccion_id)
      .eq("estado", "activo")
      .order("apellidos"),
    supabase
      .from("asistencias_curso")
      .select("alumno_id, estado, hora_dispositivo, origen")
      .eq("sesion_id", id),
  ]);

  const porAlumno = new Map((asistencias ?? []).map((a) => [a.alumno_id, a]));

  const roster = (alumnos ?? []).map((a) => {
    const registro = porAlumno.get(a.id);
    return {
      alumno_id: a.id,
      nombre: `${a.apellidos}, ${a.nombres}`,
      dni: a.dni,
      estado: registro?.estado ?? "sin_registro",
      hora: registro?.hora_dispositivo ?? null,
      origen: registro?.origen ?? null,
    };
  });

  return NextResponse.json({
    data: {
      sesion: { id: sesion.id, estado: sesion.estado },
      curso: curso.nombre,
      roster,
      total: roster.length,
      presentes: roster.filter((r) => r.estado !== "sin_registro" && r.estado !== "falta").length,
    },
  });
}
