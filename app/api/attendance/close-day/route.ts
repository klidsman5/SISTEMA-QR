import { NextResponse } from "next/server";
import { getPerfilActual } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cerrarJornadaSchema } from "@/features/puerta/schema";

export async function POST(request: Request) {
  const perfil = await getPerfilActual();
  if (perfil?.rol !== "administrador") {
    return NextResponse.json(
      { error: { code: "SIN_PERMISO", message: "Sólo el Administrador cierra la jornada" } },
      { status: 403 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = cerrarJornadaSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDACION", message: parsed.error.issues[0]?.message } },
      { status: 422 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("cerrar_jornada", {
    p_turno: parsed.data.turno_id,
    p_fecha: parsed.data.fecha,
  });

  if (error) {
    return NextResponse.json(
      { error: { code: "VALIDACION", message: error.message } },
      { status: 422 },
    );
  }

  return NextResponse.json({ data });
}
