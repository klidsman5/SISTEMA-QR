import { NextResponse } from "next/server";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDACION", message: "Usuario y contraseña son obligatorios" } },
      { status: 422 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const dominio = process.env.NEXT_PUBLIC_DOMAIN_SUFFIX ?? "colegio.local";
  const { error } = await supabase.auth.signInWithPassword({
    email: `${parsed.data.username}@${dominio}`,
    password: parsed.data.password,
  });

  if (error) {
    return NextResponse.json(
      { error: { code: "NO_AUTENTICADO", message: "Usuario o contraseña incorrectos" } },
      { status: 401 },
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: perfil } = await supabase
    .from("usuarios")
    .select("id, nombre, rol, activo, debe_cambiar_password")
    .eq("auth_user_id", user!.id)
    .maybeSingle();

  if (!perfil?.activo) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: { code: "SIN_PERMISO", message: "La cuenta está desactivada" } },
      { status: 403 },
    );
  }

  return NextResponse.json({ data: perfil });
}
