import { NextResponse } from "next/server";
import { getPerfilActual } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { reversionSchema } from "@/features/justificaciones/schema";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const perfil = await getPerfilActual();
  if (!perfil || !["administrador", "docente"].includes(perfil.rol)) {
    return NextResponse.json({ error: { code: "SIN_PERMISO", message: "Sin acceso" } }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = reversionSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDACION", message: parsed.error.issues[0]?.message } },
      { status: 422 },
    );
  }

  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("revertir_justificacion", {
    p_justificacion: id,
    p_motivo: parsed.data.motivo,
  });

  if (error) {
    return NextResponse.json({ error: { code: "VALIDACION", message: error.message } }, { status: 422 });
  }

  return NextResponse.json({ data });
}
