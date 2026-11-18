"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function exportarAntesDeRetener(desde: string, hasta: string) {
  await requireRole(["administrador"]);
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("auditoria")
    .select("id, usuario_id, accion, entidad, entidad_id, fecha")
    .gte("fecha", desde)
    .lte("fecha", `${hasta}T23:59:59`)
    .order("fecha", { ascending: true });

  if (error) return { error: error.message };

  return { ok: `${data?.length ?? 0} registros listos para exportar`, filas: data ?? [] };
}

export async function aplicarRetencionForm(formData: FormData): Promise<void> {
  const confirmacion = String(formData.get("confirmacion") ?? "");
  const hasta = String(formData.get("hasta") ?? "");
  if (!hasta) return;
  await aplicarRetencion(confirmacion, hasta);
  revalidatePath("/admin/configuracion");
}

export async function aplicarRetencion(confirmacion: string, hasta: string) {
  await requireRole(["administrador"]);

  if (confirmacion !== "CONFIRMAR") {
    return { error: "Escribe CONFIRMAR para eliminar registros antiguos" };
  }

  const supabase = await createSupabaseServerClient();
  const { error, count } = await supabase
    .from("auditoria")
    .delete({ count: "exact" })
    .lt("fecha", hasta);

  if (error) return { error: error.message };

  return { ok: `Se eliminaron ${count ?? 0} eventos de auditoría anteriores a ${hasta}` };
}
