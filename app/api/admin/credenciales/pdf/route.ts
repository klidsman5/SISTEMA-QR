import { NextResponse } from "next/server";
import { getPerfilActual } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { generarCarnets } from "@/lib/export/pdf";
import { armarCarnets } from "@/features/admin/padron/carnets";

export async function GET(request: Request) {
  const perfil = await getPerfilActual();
  if (perfil?.rol !== "administrador") {
    return NextResponse.json(
      { error: { code: "SIN_PERMISO", message: "Sólo el Administrador genera carnets" } },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const grado = url.searchParams.get("grado");
  const seccion = url.searchParams.get("seccion");
  const alumno = url.searchParams.get("alumno");

  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("alumnos")
    .select("id, dni, nombres, apellidos, grado_id, seccion_id")
    .eq("estado", "activo")
    .order("apellidos")
    .limit(1000);

  if (grado) query = query.eq("grado_id", grado);
  if (seccion) query = query.eq("seccion_id", seccion);
  if (alumno) query = query.eq("id", alumno);

  const { data: alumnos, error } = await query;
  if (error) {
    return NextResponse.json(
      { error: { code: "VALIDACION", message: error.message } },
      { status: 422 },
    );
  }
  if (!alumnos || alumnos.length === 0) {
    return NextResponse.json(
      { error: { code: "VALIDACION", message: "No hay alumnos para ese filtro" } },
      { status: 404 },
    );
  }

  const [{ data: grados }, { data: secciones }, { data: credenciales }] = await Promise.all([
    supabase.from("grados").select("id, nombre"),
    supabase.from("secciones").select("id, nombre"),
    supabase
      .from("credenciales")
      .select("alumno_id, qr_uuid, estado")
      .eq("estado", "vigente")
      .in("alumno_id", alumnos.map((a) => a.id)),
  ]);

  const carnets = armarCarnets(
    alumnos,
    (grados ?? []) as Array<{ id: string; nombre: string }>,
    (secciones ?? []) as Array<{ id: string; nombre: string }>,
    (credenciales ?? []) as Array<{ alumno_id: string; qr_uuid: string; estado: string }>,
  );

  const bytes = await generarCarnets(carnets);

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="carnets.pdf"`,
    },
  });
}
