"use server";

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { EventoAuditoria } from "@/types/database";

export interface FiltroAuditoria {
  desde?: string;
  hasta?: string;
  usuarioId?: string;
}

export async function consultarAuditoria(
  filtro: FiltroAuditoria,
): Promise<{ data?: EventoAuditoria[]; error?: string }> {
  await requireRole(["administrador"]);
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("auditoria")
    .select("id, usuario_id, accion, entidad, entidad_id, valor_anterior, valor_nuevo, fecha")
    .order("fecha", { ascending: false })
    .limit(200);

  if (filtro.desde) query = query.gte("fecha", `${filtro.desde}T00:00:00`);
  if (filtro.hasta) query = query.lte("fecha", `${filtro.hasta}T23:59:59`);
  if (filtro.usuarioId) query = query.eq("usuario_id", filtro.usuarioId);

  const { data, error } = await query;
  if (error) return { error: error.message };

  return { data: (data as EventoAuditoria[]) ?? [] };
}
