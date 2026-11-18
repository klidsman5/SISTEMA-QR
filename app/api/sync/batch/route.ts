import { NextResponse } from "next/server";
import { getPerfilActual } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { batchSchema } from "@/features/sync/schema";

export async function POST(request: Request) {
  const perfil = await getPerfilActual();
  if (!perfil || !["administrador", "auxiliar_puerta", "docente"].includes(perfil.rol)) {
    return NextResponse.json({ error: { code: "SIN_PERMISO", message: "Sin acceso" } }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = batchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDACION", message: parsed.error.issues[0]?.message } },
      { status: 422 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const resultados: Array<{ evento_id: string; resultado: string; motivo?: string; estado?: string }> = [];

  for (const evento of parsed.data.eventos) {
    const funcion =
      evento.tipo === "puerta" ? "registrar_asistencia_puerta" : "registrar_asistencia_curso";

    const { data, error } = await supabase.rpc(funcion, {
      p_evento: {
        ...evento.payload,
        evento_id: evento.evento_id,
        hora_dispositivo: evento.hora_dispositivo,
        dispositivo_id: parsed.data.dispositivo_id,
      },
    });

    if (error) {
      resultados.push({ evento_id: evento.evento_id, resultado: "invalido", motivo: error.message });
      await supabase.from("eventos_descartados").insert({
        evento_id: evento.evento_id,
        contexto: evento.tipo === "puerta" ? "puerta" : String(evento.payload.sesion_id ?? "aula"),
        alumno_id: (evento.payload.alumno_id as string | undefined) ?? null,
        motivo: "error_funcion",
        ocurrido_en: evento.hora_dispositivo,
        dispositivo_id: parsed.data.dispositivo_id,
      });
      continue;
    }

    const r = data as { resultado: string; motivo?: string; estado?: string };

    if (r.resultado === "invalido") {
      await supabase.from("eventos_descartados").insert({
        evento_id: evento.evento_id,
        contexto: evento.tipo === "puerta" ? "puerta" : String(evento.payload.sesion_id ?? "aula"),
        alumno_id: (evento.payload.alumno_id as string | undefined) ?? null,
        motivo: r.motivo ?? "invalido",
        ocurrido_en: evento.hora_dispositivo,
        dispositivo_id: parsed.data.dispositivo_id,
      });
    }

    if (r.resultado === "duplicado" && r.motivo === "debounce") {
      await supabase.from("eventos_descartados").insert({
        evento_id: evento.evento_id,
        contexto: evento.tipo === "puerta" ? "puerta" : String(evento.payload.sesion_id ?? "aula"),
        alumno_id: (evento.payload.alumno_id as string | undefined) ?? null,
        motivo: "debounce",
        ocurrido_en: evento.hora_dispositivo,
        dispositivo_id: parsed.data.dispositivo_id,
      });
    }

    resultados.push({ evento_id: evento.evento_id, resultado: r.resultado, motivo: r.motivo, estado: r.estado });
  }

  return NextResponse.json({ data: { resultados } });
}
