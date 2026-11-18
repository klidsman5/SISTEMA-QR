"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const turnoSchema = z.object({
  nombre: z.string().trim().min(3).max(20),
  hora_cierre: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa HH:MM"),
});

export async function crearTurno(formData: FormData): Promise<void> {
  const parsed = turnoSchema.safeParse({
    nombre: formData.get("nombre"),
    hora_cierre: formData.get("hora_cierre"),
  });

  if (!parsed.success) return;

  await requireRole(["administrador"]);
  const supabase = await createSupabaseServerClient();
  await supabase.from("turnos").insert(parsed.data);

  revalidatePath("/admin/horarios");
}

export async function actualizarCierreTurno(formData: FormData): Promise<void> {
  const id = String(formData.get("id") ?? "");
  const hora = String(formData.get("hora_cierre") ?? "");

  if (!id || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hora)) return;

  await requireRole(["administrador"]);
  const supabase = await createSupabaseServerClient();
  await supabase.from("turnos").update({ hora_cierre: hora }).eq("id", id);

  revalidatePath("/admin/horarios");
}
