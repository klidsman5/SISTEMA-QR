"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { parsearArchivo } from "./parser";
import { anioSchema, validarFilas } from "./schema";
import type { EstadoImportacion } from "./types";

export async function previsualizarImportacion(
  _prev: EstadoImportacion,
  formData: FormData,
): Promise<EstadoImportacion> {
  const perfil = await requireRole(["administrador"]);
  const archivo = formData.get("archivo");
  const anio = anioSchema.safeParse(formData.get("anio"));

  if (!(archivo instanceof File) || archivo.size === 0) {
    return { error: "Selecciona un archivo CSV o XLSX" };
  }
  if (!anio.success) {
    return { error: "Indica un año escolar válido" };
  }

  let filas;
  try {
    filas = await parsearArchivo(archivo);
  } catch (e) {
    return { error: e instanceof Error ? e.message : "No se pudo leer el archivo" };
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: grados }, { data: secciones }] = await Promise.all([
    supabase.from("grados").select("id, nombre").eq("activo", true),
    supabase.from("secciones").select("id, grado_id, nombre").eq("activo", true),
  ]);

  const { validas, errores } = validarFilas(filas, {
    grados: (grados ?? []) as Array<{ id: string; nombre: string }>,
    secciones: (secciones ?? []) as Array<{ id: string; grado_id: string; nombre: string }>,
  });

  const { data: importacion, error } = await supabase
    .from("importaciones")
    .insert({
      usuario_id: perfil.id,
      archivo: archivo.name,
      anio_escolar: anio.data,
      total_filas: filas.length,
      filas_validas: validas.length,
      filas_error: errores.length,
      detalle: { validas, errores: errores.slice(0, 200) },
      estado: "preview",
    })
    .select("id")
    .single();

  if (error || !importacion) {
    return { error: error?.message ?? "No se pudo registrar la previsualización" };
  }

  return {
    ok: `${validas.length} filas válidas de ${filas.length}`,
    importId: importacion.id,
    total: filas.length,
    validas: validas.length,
    errores: errores.slice(0, 20),
  };
}

export async function confirmarImportacion(
  _prev: EstadoImportacion,
  formData: FormData,
): Promise<EstadoImportacion> {
  await requireRole(["administrador"]);
  const importId = String(formData.get("importId") ?? "");
  if (!importId) return { error: "Falta la importación a confirmar" };

  const supabase = await createSupabaseServerClient();
  const { data: importacion } = await supabase
    .from("importaciones")
    .select("id, anio_escolar, detalle, estado, expires_at")
    .eq("id", importId)
    .single();

  if (!importacion) return { error: "Importación no encontrada" };
  if (importacion.estado !== "preview") return { error: "Esta importación ya fue procesada" };
  if (new Date(importacion.expires_at).getTime() < Date.now()) {
    return { error: "La previsualización expiró. Vuelve a validar el archivo." };
  }

  const validas = (importacion.detalle as { validas?: unknown[] })?.validas ?? [];
  if (validas.length === 0) return { error: "No hay filas válidas para importar" };

  const { error: errorRpc } = await supabase.rpc("importar_alumnos", {
    p_anio: importacion.anio_escolar,
    p_alumnos: validas,
  });

  if (errorRpc) {
    await supabase.from("importaciones").update({ estado: "fallida" }).eq("id", importId);
    return { error: errorRpc.message };
  }

  await supabase.from("importaciones").update({ estado: "confirmada" }).eq("id", importId);

  revalidatePath("/admin/padron");
  revalidatePath("/admin/credenciales");
  return { ok: `Importación confirmada: ${validas.length} alumnos` };
}

export type EstadoCredencial = { ok?: string; error?: string } | null;

export async function revocarCredencialState(
  _prev: EstadoCredencial,
  formData: FormData,
): Promise<EstadoCredencial> {
  return revocarCredencial(formData);
}

export async function revocarCredencial(formData: FormData) {
  await requireRole(["administrador"]);
  const alumnoId = String(formData.get("alumnoId") ?? "");
  const motivo = String(formData.get("motivo") ?? "Perdida o deterioro");

  if (!alumnoId) return { error: "Falta el alumno" };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("revocar_credencial", {
    p_alumno: alumnoId,
    p_motivo: motivo,
  });

  if (error) return { error: error.message };

  revalidatePath("/admin/credenciales");
  return { ok: "Credencial revocada y reemitida" };
}

export async function darBajaAusentes(formData: FormData): Promise<void> {
  await requireRole(["administrador"]);
  const anio = anioSchema.safeParse(formData.get("anio"));
  if (!anio.success) return;

  const supabase = await createSupabaseServerClient();

  const { count } = await supabase
    .from("importaciones")
    .select("id", { count: "exact", head: true })
    .eq("estado", "preview");

  if ((count ?? 0) > 0 && !formData.get("forzar")) return;

  await supabase.rpc("dar_baja_ausentes", { p_anio: anio.data });

  revalidatePath("/admin/padron");
}
