import { NextResponse } from "next/server";
import { getPerfilActual } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function escapar(valor: unknown) {
  const texto = String(valor ?? "");
  return `"${texto.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const perfil = await getPerfilActual();
  if (perfil?.rol !== "administrador") {
    return NextResponse.json(
      { error: { code: "SIN_PERMISO", message: "Sólo el Administrador exporta" } },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const desde = url.searchParams.get("desde");
  const hasta = url.searchParams.get("hasta");

  if (!desde || !hasta) {
    return NextResponse.json(
      { error: { code: "VALIDACION", message: "Indica el rango de fechas" } },
      { status: 422 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("auditoria")
    .select("fecha, usuario_id, accion, entidad, entidad_id")
    .gte("fecha", desde)
    .lte("fecha", `${hasta}T23:59:59`)
    .order("fecha", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: { code: "VALIDACION", message: error.message } },
      { status: 422 },
    );
  }

  const lineas = [
    ["fecha", "usuario_id", "accion", "entidad", "entidad_id"].map(escapar).join(","),
    ...(data ?? []).map((f) =>
      [f.fecha, f.usuario_id, f.accion, f.entidad, f.entidad_id].map(escapar).join(","),
    ),
  ];

  return new NextResponse(lineas.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="auditoria_${desde}_${hasta}.csv"`,
    },
  });
}
