import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Perfil, Rol } from "@/types/database";

export async function getPerfilActual(): Promise<Perfil | null> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("usuarios")
    .select("id, auth_user_id, nombre, username, rol, activo, debe_cambiar_password")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  return (data as Perfil | null) ?? null;
}

export async function requireRole(roles: Rol[]): Promise<Perfil> {
  const perfil = await getPerfilActual();

  if (!perfil) redirect("/login");
  if (!perfil.activo) redirect("/login?error=cuenta-inactiva");
  if (perfil.debe_cambiar_password) redirect("/cambiar-password");
  if (!roles.includes(perfil.rol)) redirect("/sin-acceso");

  return perfil;
}

export function homePorRol(rol: Rol): string {
  switch (rol) {
    case "administrador":
      return "/admin/usuarios";
    case "auxiliar_puerta":
      return "/puerta";
    case "docente":
      return "/aula";
  }
}
