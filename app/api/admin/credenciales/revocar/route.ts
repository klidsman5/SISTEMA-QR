import { NextResponse } from "next/server";
import { getPerfilActual } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { z } from "zod";

const bodySchema = z.object({
  alumnoId: z.string().uuid(),
  motivo: z.string().trim().min(3).max(200).default("Perdida o deterioro"),
});

export async function POST(request: Request) {
  const perfil = await getPerfilActual();
  if (perfil?.rol !== "administrador") {
    return NextResponse.json(
      { error: { code: "SIN_PERMISO", message: "Sólo el Administrador revoca credenciales" } },
      { status: 403 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDACION", message: parsed.error.issues[0]?.message } },
      { status: 422 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("revocar_credencial", {
    p_alumno: parsed.data.alumnoId,
    p_motivo: parsed.data.motivo,
  });

  if (error) {
    return NextResponse.json(
      { error: { code: "VALIDACION", message: error.message } },
      { status: 422 },
    );
  }

  return NextResponse.json({ data: { ok: true } });
}
