"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parametrosSchema } from "./schema";

export async function guardarParametros(formData: FormData): Promise<void> {
  const parsed = parametrosSchema.safeParse({
    debounce_puerta_min: formData.get("debounce_puerta_min"),
    desfase_reloj_min: formData.get("desfase_reloj_min"),
    duracion_bloque_min: formData.get("duracion_bloque_min"),
    retencion_dias: formData.get("retencion_dias"),
  });

  if (!parsed.success) return;

  await requireRole(["administrador"]);
  const supabase = await createSupabaseServerClient();

  const filas = Object.entries(parsed.data).map(([clave, valor]) => ({
    clave,
    valor: valor as number,
  }));

  await supabase.from("configuracion").upsert(filas, { onConflict: "clave" });

  revalidatePath("/admin/configuracion");
}
