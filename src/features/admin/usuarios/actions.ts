"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { puedeDesactivar } from "./rules";
import { usuarioCreateSchema, usuarioUpdateSchema } from "./schema";

function correoPara(username: string) {
  const dominio = process.env.NEXT_PUBLIC_DOMAIN_SUFFIX ?? "colegio.local";
  return `${username}@${dominio}`;
}

function passwordTemporal() {
  return `Tmp-${randomBytes(6).toString("base64url")}1!`;
}

export async function crearUsuario(formData: FormData) {
  await requireRole(["administrador"]);

  const parsed = usuarioCreateSchema.safeParse({
    nombre: formData.get("nombre"),
    username: formData.get("username"),
    rol: formData.get("rol"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const admin = createSupabaseAdminClient();
  const { data: creado, error: errorAuth } = await admin.auth.admin.createUser({
    email: correoPara(parsed.data.username),
    password: parsed.data.password,
    email_confirm: true,
  });

  if (errorAuth || !creado.user) {
    return { error: errorAuth?.message ?? "No se pudo crear la cuenta" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("crear_perfil", {
    p_auth_id: creado.user.id,
    p_nombre: parsed.data.nombre,
    p_username: parsed.data.username,
    p_rol: parsed.data.rol,
  });

  if (error) {
    await admin.auth.admin.deleteUser(creado.user.id);
    return { error: error.message };
  }

  revalidatePath("/admin/usuarios");
  return { ok: "Cuenta creada" };
}

export async function actualizarUsuario(formData: FormData) {
  await requireRole(["administrador"]);

  const parsed = usuarioUpdateSchema.safeParse({
    id: formData.get("id"),
    nombre: formData.get("nombre"),
    rol: formData.get("rol"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };
  }

  const supabase = await createSupabaseServerClient();
  const { data: actual } = await supabase
    .from("usuarios")
    .select("rol, activo")
    .eq("id", parsed.data.id)
    .single();

  if (actual?.rol === "administrador" && parsed.data.rol !== "administrador") {
    const { count } = await supabase
      .from("usuarios")
      .select("id", { count: "exact", head: true })
      .eq("rol", "administrador")
      .eq("activo", true);

    if (!puedeDesactivar("administrador", count ?? 0)) {
      return { error: "No se puede quitar el rol al último Administrador activo" };
    }
  }

  const { error } = await supabase
    .from("usuarios")
    .update({ nombre: parsed.data.nombre, rol: parsed.data.rol, updated_at: new Date().toISOString() })
    .eq("id", parsed.data.id);

  if (error) return { error: error.message };

  revalidatePath("/admin/usuarios");
  return { ok: "Cuenta actualizada" };
}

export async function desactivarUsuario(formData: FormData): Promise<void> {
  await requireRole(["administrador"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createSupabaseServerClient();
  const { data: usuario } = await supabase.from("usuarios").select("rol").eq("id", id).single();

  if (!usuario) return;

  const { count } = await supabase
    .from("usuarios")
    .select("id", { count: "exact", head: true })
    .eq("rol", "administrador")
    .eq("activo", true);

  if (!puedeDesactivar(usuario.rol, count ?? 0)) return;

  await supabase.from("usuarios").update({ activo: false }).eq("id", id);

  revalidatePath("/admin/usuarios");
}

export async function reactivarUsuario(formData: FormData): Promise<void> {
  await requireRole(["administrador"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createSupabaseServerClient();
  await supabase.from("usuarios").update({ activo: true }).eq("id", id);

  revalidatePath("/admin/usuarios");
}

export type EstadoAccion = { ok?: string; error?: string } | null;

export async function restablecerPasswordState(
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return restablecerPassword(formData);
}

export async function crearUsuarioState(
  _prev: EstadoAccion,
  formData: FormData,
): Promise<EstadoAccion> {
  return crearUsuario(formData);
}

export async function restablecerPassword(formData: FormData) {
  await requireRole(["administrador"]);
  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Falta el identificador" };

  const supabase = await createSupabaseServerClient();
  const { data: usuario } = await supabase
    .from("usuarios")
    .select("id, auth_user_id")
    .eq("id", id)
    .single();

  if (!usuario?.auth_user_id) return { error: "La cuenta no tiene usuario de acceso" };

  const temporal = passwordTemporal();
  const admin = createSupabaseAdminClient();
  const { error: errorAuth } = await admin.auth.admin.updateUserById(usuario.auth_user_id, {
    password: temporal,
  });

  if (errorAuth) return { error: errorAuth.message };

  const { error } = await supabase.rpc("marcar_cambio_password", { p_usuario: id });
  if (error) return { error: error.message };

  revalidatePath("/admin/usuarios");
  return { ok: `Contraseña temporal: ${temporal}` };
}
