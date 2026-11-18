import { notFound, redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { PageTitle } from "@/components/ui";
import { SessionClient } from "@/features/aula/SessionClient";

export default async function SesionPage({ params }: { params: Promise<{ sesionId: string }> }) {
  const perfil = await requireRole(["docente", "administrador"]);
  const { sesionId } = await params;
  const supabase = await createSupabaseServerClient();

  const { data: sesion } = await supabase
    .from("sesiones_clase")
    .select("id, curso_id, estado, docente_id, fecha")
    .eq("id", sesionId)
    .maybeSingle();

  if (!sesion) notFound();
  if (perfil.rol === "docente" && sesion.docente_id !== perfil.id) redirect("/aula");

  const { data: curso } = await supabase
    .from("cursos")
    .select("nombre, seccion_id")
    .eq("id", sesion.curso_id)
    .single();

  if (!curso) notFound();

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
      .eq("sesion_id", sesionId),
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

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title={`Sesión · ${curso.nombre}`}
        subtitle={sesion.estado === "abierta" ? "Escanea credenciales o cierra la sesión para marcar faltas." : "Sesión cerrada."}
      />
      <SessionClient
        sesionId={sesionId}
        curso={curso.nombre}
        abierta={sesion.estado === "abierta"}
        rosterInicial={roster}
      />
    </div>
  );
}
