import { NextResponse } from "next/server";
import { getPerfilActual } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { justificacionCreateSchema } from "@/features/justificaciones/schema";

export async function GET(request: Request) {
  const perfil = await getPerfilActual();
  if (!perfil || !["administrador", "docente"].includes(perfil.rol)) {
    return NextResponse.json({ error: { code: "SIN_PERMISO", message: "Sin acceso" } }, { status: 403 });
  }

  const url = new URL(request.url);
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("justificaciones")
    .select("id, alumno_id, tipo, nivel, fecha, motivo, observacion, estado, aprobado_por, aprobado_en, alumnos(nombres, apellidos, dni)")
    .order("fecha", { ascending: false })
    .limit(100);

  const alumno = url.searchParams.get("alumno");
  const desde = url.searchParams.get("desde");
  const hasta = url.searchParams.get("hasta");
  if (alumno) query = query.eq("alumno_id", alumno);
  if (desde) query = query.gte("fecha", desde);
  if (hasta) query = query.lte("fecha", hasta);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: { code: "VALIDACION", message: error.message } }, { status: 422 });
  }

  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: Request) {
  const perfil = await getPerfilActual();
  if (!perfil || !["administrador", "docente"].includes(perfil.rol)) {
    return NextResponse.json({ error: { code: "SIN_PERMISO", message: "Sin acceso" } }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = justificacionCreateSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDACION", message: parsed.error.issues[0]?.message } },
      { status: 422 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const input = parsed.data;

  let alumnoId = input.alumno_id;
  if (!alumnoId) {
    const { data: alumno } = await supabase
      .from("alumnos")
      .select("id, estado")
      .eq("dni", input.dni!)
      .maybeSingle();

    if (!alumno || alumno.estado !== "activo") {
      return NextResponse.json(
        { error: { code: "VALIDACION", message: "Alumno no encontrado o dado de baja" } },
        { status: 422 },
      );
    }
    alumnoId = alumno.id;
  }

  if (input.tipo === "posterior") {
    const [{ count: enPuerta }, { count: enAula }] = await Promise.all([
      supabase
        .from("asistencias_puerta")
        .select("id", { count: "exact", head: true })
        .eq("alumno_id", alumnoId)
        .eq("fecha", input.fecha)
        .in("estado", ["falta", "tardanza"]),
      supabase
        .from("asistencias_curso")
        .select("id", { count: "exact", head: true })
        .eq("alumno_id", alumnoId)
        .eq("fecha", input.fecha)
        .in("estado", ["falta", "tardanza"]),
    ]);

    if ((enPuerta ?? 0) === 0 && (enAula ?? 0) === 0) {
      return NextResponse.json(
        { error: { code: "VALIDACION", message: "No hay faltas ni tardanzas ese día para justificar" } },
        { status: 422 },
      );
    }
  }

  const { data: creada, error } = await supabase
    .from("justificaciones")
    .insert({
      alumno_id: alumnoId,
      tipo: input.tipo,
      nivel: input.nivel,
      fecha: input.fecha,
      motivo: input.motivo,
      observacion: input.observacion,
      aprobado_por: perfil.id,
    })
    .select("id")
    .single();

  if (error || !creada) {
    const mensaje = error?.code === "23505" ? "Ya existe una justificación vigente para ese día" : error?.message;
    return NextResponse.json({ error: { code: "VALIDACION", message: mensaje } }, { status: 409 });
  }

  const { data: aplicado, error: errorAplicar } = await supabase.rpc("aplicar_justificacion", {
    p_justificacion: creada.id,
  });

  if (errorAplicar) {
    return NextResponse.json(
      { error: { code: "VALIDACION", message: errorAplicar.message } },
      { status: 422 },
    );
  }

  return NextResponse.json({ data: { id: creada.id, aplicado } }, { status: 201 });
}
