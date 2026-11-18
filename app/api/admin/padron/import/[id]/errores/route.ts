import { NextResponse } from "next/server";
import { getPerfilActual } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function escapar(valor: unknown) {
  return `"${String(valor ?? "").replaceAll('"', '""')}"`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const perfil = await getPerfilActual();
  if (perfil?.rol !== "administrador") {
    return NextResponse.json(
      { error: { code: "SIN_PERMISO", message: "Sólo el Administrador descarga errores" } },
      { status: 403 },
    );
  }

  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase
    .from("importaciones")
    .select("archivo, detalle")
    .eq("id", id)
    .single();

  if (!data) {
    return NextResponse.json(
      { error: { code: "VALIDACION", message: "Importación no encontrada" } },
      { status: 404 },
    );
  }

  const errores = (data.detalle as { errores?: Array<Record<string, unknown>> })?.errores ?? [];
  const lineas = [
    ["fila", "campo", "detalle"].map(escapar).join(","),
    ...errores.map((e) => [e.fila, e.campo, e.detalle].map(escapar).join(",")),
  ];

  return new NextResponse(lineas.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="errores_${data.archivo}.csv"`,
    },
  });
}
