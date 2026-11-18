"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { gradoCreateSchema, seccionCreateSchema } from "./schema";

async function clienteAdmin() {
  await requireRole(["administrador"]);
  return createSupabaseServerClient();
}

export async function crearGrado(formData: FormData): Promise<void> {
  const parsed = gradoCreateSchema.safeParse({
    nombre: formData.get("nombre"),
    turno_id: formData.get("turno_id"),
    hora_entrada: formData.get("hora_entrada"),
    tolerancia_min: formData.get("tolerancia_min"),
  });

  if (!parsed.success) return;

  const supabase = await clienteAdmin();
  await supabase.from("grados").insert(parsed.data);

  revalidatePath("/admin/estructura");
  revalidatePath("/admin/horarios");
}

export async function crearSeccion(formData: FormData): Promise<void> {
  const parsed = seccionCreateSchema.safeParse({
    grado_id: formData.get("grado_id"),
    nombre: formData.get("nombre"),
  });

  if (!parsed.success) return;

  const supabase = await clienteAdmin();
  await supabase.from("secciones").insert(parsed.data);

  revalidatePath("/admin/estructura");
}

export async function desactivarSeccion(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await clienteAdmin();
  await supabase.from("secciones").update({ activo: false }).eq("id", id);

  revalidatePath("/admin/estructura");
}

export async function desactivarGrado(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await clienteAdmin();
  await supabase.from("grados").update({ activo: false }).eq("id", id);

  revalidatePath("/admin/estructura");
  revalidatePath("/admin/horarios");
}
