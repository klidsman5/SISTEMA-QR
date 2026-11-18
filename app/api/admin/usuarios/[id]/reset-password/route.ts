import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getPerfilActual } from "@/lib/auth/require-role";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const perfil = await getPerfilActual();
  if (perfil?.rol !== "administrador") {
    return NextResponse.json(
      { error: { code: "SIN_PERMISO", message: "Sólo el Administrador restablece contraseñas" } },
      { status: 403 },
    );
  }

  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id, auth_user_id")
    .eq("id", id)
    .single();

  if (!usuario?.auth_user_id) {
    return NextResponse.json(
      { error: { code: "VALIDACION", message: "La cuenta no tiene acceso" } },
      { status: 422 },
    );
  }

  const temporal = `Tmp-${randomBytes(6).toString("base64url")}1!`;
  const admin = createSupabaseAdminClient();
  const { error: errorAuth } = await admin.auth.admin.updateUserById(usuario.auth_user_id, {
    password: temporal,
  });

  if (errorAuth) {
    return NextResponse.json(
      { error: { code: "VALIDACION", message: errorAuth.message } },
      { status: 422 },
    );
  }

  const { error } = await supabase.rpc("marcar_cambio_password", { p_usuario: id });
  if (error) {
    return NextResponse.json(
      { error: { code: "VALIDACION", message: error.message } },
      { status: 422 },
    );
  }

  return NextResponse.json({ data: { passwordTemporal: temporal } });
}
