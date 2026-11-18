"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cursoCreateSchema } from "../estructura/schema";

export async function crearCurso(formData: FormData): Promise<void> {
  const parsed = cursoCreateSchema.safeParse({
    seccion_id: formData.get("seccion_id"),
    docente_id: formData.get("docente_id") ?? "",
    nombre: formData.get("nombre"),
    hora_inicio: formData.get("hora_inicio"),
    duracion_bloque_min: formData.get("duracion_bloque_min") ?? 45,
    tolerancia_min: formData.get("tolerancia_min") ?? 5,
  });

  if (!parsed.success) return;

  await requireRole(["administrador"]);
  const supabase = await createSupabaseServerClient();

  await supabase.from("cursos").insert({
    ...parsed.data,
    docente_id: parsed.data.docente_id ?? null,
  });

  revalidatePath("/admin/estructura");
  revalidatePath("/admin/horarios");
}

export async function desactivarCurso(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await requireRole(["administrador"]);
  const supabase = await createSupabaseServerClient();
  await supabase.from("cursos").update({ activo: false }).eq("id", id);

  revalidatePath("/admin/estructura");
}
