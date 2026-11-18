import { NextResponse } from "next/server";
import { getPerfilActual } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const perfil = await getPerfilActual();
  if (!perfil || !["administrador", "auxiliar_puerta"].includes(perfil.rol)) {
    return NextResponse.json(
      { error: { code: "SIN_PERMISO", message: "Sin acceso" } },
      { status: 403 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("asistencias_puerta")
    .select("id, fecha, hora_dispositivo, estado, origen, requisito:registrado_por, alumnos(nombres, apellidos, dni, grado_id, seccion_id)")
    .order("hora_dispositivo", { ascending: false })
    .limit(300);

  if (error) {
    return NextResponse.json(
      { error: { code: "VALIDACION", message: error.message } },
      { status: 422 },
    );
  }

  return NextResponse.json({ data: data ?? [] });
}
