"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { homePorRol } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const loginSchema = z.object({
  username: z.string().trim().min(1, "Ingresa tu usuario"),
  password: z.string().min(1, "Ingresa tu contraseña"),
});

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!parsed.success) redirect("/login?error=datos");

  const supabase = await createSupabaseServerClient();
  const dominio = process.env.NEXT_PUBLIC_DOMAIN_SUFFIX ?? "colegio.local";

  const { error } = await supabase.auth.signInWithPassword({
    email: `${parsed.data.username}@${dominio}`,
    password: parsed.data.password,
  });

  if (error) redirect("/login?error=credenciales");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("usuarios")
    .select("rol, activo, debe_cambiar_password")
    .eq("auth_user_id", user!.id)
    .maybeSingle();

  if (!perfil?.activo) {
    await supabase.auth.signOut();
    redirect("/login?error=cuenta-inactiva");
  }

  if (perfil.debe_cambiar_password) redirect("/cambiar-password");

  redirect(homePorRol(perfil.rol));
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function cambiarPasswordAction(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  const confirmacion = String(formData.get("confirmacion") ?? "");

  if (password.length < 8) redirect("/cambiar-password?error=corta");
  if (password !== confirmacion) redirect("/cambiar-password?error=distintas");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect("/cambiar-password?error=actualizar");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase
      .from("usuarios")
      .update({ debe_cambiar_password: false })
      .eq("auth_user_id", user.id);
  }

  redirect("/login?cambiada=1");
}
