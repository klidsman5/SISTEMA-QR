import type { SupabaseClient } from "@supabase/supabase-js";
import type { FiltrosReporte } from "./filters";

export interface DetalleReporte {
  id: string;
  nivel: string;
  fecha: string;
  hora: string;
  estado: string;
  origen: string;
  nombres: string;
  apellidos: string;
  dni: string;
  grado_id: string | null;
  seccion_id: string | null;
  curso: string | null;
  curso_id: string | null;
}

export async function consultarDetalle(
  supabase: SupabaseClient,
  filtros: FiltrosReporte,
): Promise<DetalleReporte[]> {
  let query = supabase
    .from("v_asistencia_detalle")
    .select("id, nivel, fecha, hora, estado, origen, nombres, apellidos, dni, grado_id, seccion_id, curso, curso_id")
    .order("fecha", { ascending: false })
    .order("hora", { ascending: false })
    .limit(5000);

  if (filtros.desde) query = query.gte("fecha", filtros.desde);
  if (filtros.hasta) query = query.lte("fecha", filtros.hasta);
  if (filtros.alumno) query = query.eq("alumno_id", filtros.alumno);
  if (filtros.grado) query = query.eq("grado_id", filtros.grado);
  if (filtros.seccion) query = query.eq("seccion_id", filtros.seccion);
  if (filtros.curso) query = query.eq("curso_id", filtros.curso);
  if (filtros.nivel) query = query.eq("nivel", filtros.nivel);
  if (filtros.estado) query = query.eq("estado", filtros.estado);

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []) as DetalleReporte[];
}
