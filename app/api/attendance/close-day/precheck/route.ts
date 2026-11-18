import { NextResponse } from "next/server";
import { getPerfilActual } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const perfil = await getPerfilActual();
  if (perfil?.rol !== "administrador") {
    return NextResponse.json(
      { error: { code: "SIN_PERMISO", message: "Sólo el Administrador" } },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const turno = url.searchParams.get("turno");
  const fecha = url.searchParams.get("fecha") ?? new Date().toISOString().slice(0, 10);

  if (!turno) {
    return NextResponse.json(
      { error: { code: "VALIDACION", message: "Indica el turno" } },
      { status: 422 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { count: conEntrada } = await supabase
    .from("asistencias_puerta")
    .select("id", { count: "exact", head: true })
    .eq("fecha", fecha)
    .in("origen", ["escaneo", "manual"]);

  const { count: activos } = await supabase
    .from("alumnos")
    .select("id, grados!inner(turno_id)", { count: "exact", head: true })
    .eq("estado", "activo")
    .eq("grados.turno_id", turno);

  return NextResponse.json({
    data: {
      fecha,
      alumnosActivos: activos ?? 0,
      conEntrada: conEntrada ?? 0,
      sinEntrada: Math.max((activos ?? 0) - (conEntrada ?? 0), 0),
    },
  });
}
