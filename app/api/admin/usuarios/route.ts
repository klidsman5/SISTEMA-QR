import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getPerfilActual } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { usuarioCreateSchema } from "@/features/admin/usuarios/schema";

export async function POST(request: Request) {
  const perfil = await getPerfilActual();
  if (perfil?.rol !== "administrador") {
    return NextResponse.json(
      { error: { code: "SIN_PERMISO", message: "Sólo el Administrador crea cuentas" } },
      { status: 403 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = usuarioCreateSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDACION", message: parsed.error.issues[0]?.message } },
      { status: 422 },
    );
  }

  const admin = createSupabaseAdminClient();
  const dominio = process.env.NEXT_PUBLIC_DOMAIN_SUFFIX ?? "colegio.local";
  const { data: creado, error: errorAuth } = await admin.auth.admin.createUser({
    email: `${parsed.data.username}@${dominio}`,
    password: parsed.data.password,
    email_confirm: true,
  });

  if (errorAuth || !creado.user) {
    return NextResponse.json(
      { error: { code: "VALIDACION", message: errorAuth?.message ?? "No se pudo crear" } },
      { status: 422 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("crear_perfil", {
    p_auth_id: creado.user.id,
    p_nombre: parsed.data.nombre,
    p_username: parsed.data.username,
    p_rol: parsed.data.rol,
  });

  if (error) {
    await admin.auth.admin.deleteUser(creado.user.id);
    return NextResponse.json(
      { error: { code: "VALIDACION", message: error.message } },
      { status: 422 },
    );
  }

  return NextResponse.json({ data: { id: data } }, { status: 201 });
}
