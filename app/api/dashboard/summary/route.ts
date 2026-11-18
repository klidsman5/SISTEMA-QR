import { NextResponse } from "next/server";
import { getPerfilActual } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { porcentaje, rangoPorDefecto } from "@/features/reportes/filters";
import { consultarDetalle } from "@/features/reportes/query";

export async function GET(request: Request) {
  const perfil = await getPerfilActual();
  if (!perfil || !["administrador", "docente"].includes(perfil.rol)) {
    return NextResponse.json({ error: { code: "SIN_PERMISO", message: "Sin acceso" } }, { status: 403 });
  }

  const url = new URL(request.url);
  const defaults = rangoPorDefecto();
  const desde = url.searchParams.get("desde") ?? defaults.desde;
  const hasta = url.searchParams.get("hasta") ?? defaults.hasta;

  const supabase = await createSupabaseServerClient();
  const detalle = await consultarDetalle(supabase, { desde, hasta });

  const total = detalle.length;
  const puntuales = detalle.filter((d) => d.estado === "puntual").length;
  const tardanzas = detalle.filter((d) => d.estado === "tardanza").length;
  const faltas = detalle.filter((d) => d.estado === "falta").length;
  const justificados = detalle.filter((d) => d.estado === "justificado").length;

  const porDia = new Map<string, { total: number; presentes: number }>();
  for (const d of detalle) {
    const actual = porDia.get(d.fecha) ?? { total: 0, presentes: 0 };
    actual.total += 1;
    if (d.estado === "puntual" || d.estado === "tardanza" || d.estado === "justificado") actual.presentes += 1;
    porDia.set(d.fecha, actual);
  }

  const porGrado = new Map<string, { total: number; faltas: number }>();
  for (const d of detalle) {
    const clave = d.grado_id ?? "sin-grado";
    const actual = porGrado.get(clave) ?? { total: 0, faltas: 0 };
    actual.total += 1;
    if (d.estado === "falta") actual.faltas += 1;
    porGrado.set(clave, actual);
  }

  return NextResponse.json({
    data: {
      desde,
      hasta,
      total,
      puntuales,
      tardanzas,
      faltas,
      justificados,
      asistencia: porcentaje(total - faltas, total),
      puntualidad: porcentaje(puntuales, total),
      tendencia: [...porDia.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([fecha, v]) => ({ fecha, asistencia: porcentaje(v.presentes, v.total), total: v.total })),
      porGrado: [...porGrado.entries()].map(([grado_id, v]) => ({
        grado_id,
        ausentismo: porcentaje(v.faltas, v.total),
        total: v.total,
      })),
    },
  });
}
