import { NextResponse } from "next/server";
import { getPerfilActual } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { filtrosDesdeParams, forzarAlcanceRol, rangoPorDefecto } from "@/features/reportes/filters";
import { consultarDetalle } from "@/features/reportes/query";
import { generarPdf, generarXlsx, type FilaReporte } from "@/lib/export/reportes";

export async function GET(request: Request) {
  const perfil = await getPerfilActual();
  if (!perfil || !["administrador", "auxiliar_puerta", "docente"].includes(perfil.rol)) {
    return NextResponse.json({ error: { code: "SIN_PERMISO", message: "Sin acceso" } }, { status: 403 });
  }

  const url = new URL(request.url);
  const formato = url.searchParams.get("formato") === "pdf" ? "pdf" : "xlsx";
  const defaults = rangoPorDefecto();
  // El alcance se impone en servidor: el Docente nunca recibe registros de puerta.
  const filtros = forzarAlcanceRol(filtrosDesdeParams(url.searchParams), perfil.rol);
  if (!filtros.desde) filtros.desde = defaults.desde;
  if (!filtros.hasta) filtros.hasta = defaults.hasta;

  const supabase = await createSupabaseServerClient();

  try {
    const detalle = await consultarDetalle(supabase, filtros);

    const [{ data: grados }, { data: secciones }] = await Promise.all([
      supabase.from("grados").select("id, nombre"),
      supabase.from("secciones").select("id, nombre"),
    ]);
    const nombreGrado = new Map((grados ?? []).map((g) => [g.id, g.nombre]));
    const nombreSeccion = new Map((secciones ?? []).map((s) => [s.id, s.nombre]));

    const filas: FilaReporte[] = detalle.map((d) => ({
      fecha: d.fecha,
      hora: d.hora.slice(11, 16),
      alumno: `${d.apellidos}, ${d.nombres}`,
      dni: d.dni,
      grado: d.grado_id ? nombreGrado.get(d.grado_id) ?? "" : "",
      seccion: d.seccion_id ? nombreSeccion.get(d.seccion_id) ?? "" : "",
      curso: d.curso ?? "",
      nivel: d.nivel,
      estado: d.estado,
      origen: d.origen,
    }));

    await supabase.from("reportes_generados").insert({
      usuario_id: perfil.id,
      rango_desde: filtros.desde,
      rango_hasta: filtros.hasta,
      filtros,
      formato,
      filas: filas.length,
      estado: "ok",
    });

    const titulo = `Asistencia ${filtros.desde} a ${filtros.hasta}`;

    if (formato === "pdf") {
      const bytes = await generarPdf(filas, titulo);
      return new NextResponse(Buffer.from(bytes), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="asistencia_${filtros.desde}_${filtros.hasta}.pdf"`,
        },
      });
    }

    const buffer = await generarXlsx(filas);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="asistencia_${filtros.desde}_${filtros.hasta}.xlsx"`,
      },
    });
  } catch (e) {
    await supabase.from("reportes_generados").insert({
      usuario_id: perfil.id,
      rango_desde: filtros.desde,
      rango_hasta: filtros.hasta,
      filtros,
      formato,
      filas: 0,
      estado: "error",
    });

    return NextResponse.json(
      { error: { code: "VALIDACION", message: e instanceof Error ? e.message : "Error al generar" } },
      { status: 422 },
    );
  }
}
