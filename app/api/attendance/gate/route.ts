import { NextResponse } from "next/server";
import { getPerfilActual } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { registrarEntradaSchema } from "@/features/puerta/schema";

export async function POST(request: Request) {
  const perfil = await getPerfilActual();
  if (!perfil || !["administrador", "auxiliar_puerta"].includes(perfil.rol)) {
    return NextResponse.json(
      { error: { code: "SIN_PERMISO", message: "Sólo puerta o el Administrador registran entradas" } },
      { status: 403 },
    );
  }

  const json = await request.json().catch(() => null);
  const parsed = registrarEntradaSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDACION", message: parsed.error.issues[0]?.message } },
      { status: 422 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const input = parsed.data;

  let qrUuid = input.qr_uuid;

  if (!qrUuid) {
    const { data: alumno } = await supabase
      .from("alumnos")
      .select("id")
      .or(`id.eq.${input.alumno_id ?? "00000000-0000-0000-0000-000000000000"},dni.eq.${input.dni ?? ""}`)
      .eq("estado", "activo")
      .maybeSingle();

    if (!alumno) {
      return NextResponse.json(
        { error: { code: "CREDENCIAL_INVALIDA", message: "Alumno no encontrado" } },
        { status: 409 },
      );
    }

    const { data: credencial } = await supabase
      .from("credenciales")
      .select("qr_uuid")
      .eq("alumno_id", alumno.id)
      .eq("estado", "vigente")
      .maybeSingle();

    if (!credencial) {
      return NextResponse.json(
        { error: { code: "CREDENCIAL_INVALIDA", message: "El alumno no tiene credencial vigente" } },
        { status: 409 },
      );
    }

    qrUuid = credencial.qr_uuid;
  }

  const { data: contexto } = await supabase
    .from("credenciales")
    .select("alumno_id, alumnos(id, dni, nombres, apellidos, grado_id, seccion_id)")
    .eq("qr_uuid", qrUuid)
    .eq("estado", "vigente")
    .maybeSingle();

  if (!contexto) {
    return NextResponse.json(
      { error: { code: "CREDENCIAL_INVALIDA", message: "Credencial desconocida o revocada" } },
      { status: 409 },
    );
  }

  const alumno = Array.isArray(contexto.alumnos) ? contexto.alumnos[0] : contexto.alumnos;

  const { data, error } = await supabase.rpc("registrar_asistencia_puerta", {
    p_evento: {
      evento_id: input.evento_id ?? crypto.randomUUID(),
      qr_uuid: qrUuid,
      hora_dispositivo: input.hora_dispositivo ?? new Date().toISOString(),
      dispositivo_id: input.dispositivo_id ?? "web",
      origen: input.origen,
      motivo: input.motivo ?? null,
    },
  });

  if (error) {
    return NextResponse.json(
      { error: { code: "VALIDACION", message: error.message } },
      { status: 422 },
    );
  }

  const resultado = data as { resultado: string; motivo?: string; estado?: string };

  if (resultado.resultado === "invalido") {
    return NextResponse.json(
      {
        error: {
          code: resultado.motivo?.toUpperCase() ?? "CREDENCIAL_INVALIDA",
          message:
            resultado.motivo === "credencial_revocada"
              ? "Credencial revocada"
              : resultado.motivo === "alumno_de_baja"
                ? "Alumno dado de baja"
                : "Credencial no reconocida",
        },
      },
      { status: 409 },
    );
  }

  const [{ data: grado }, { data: seccion }] = await Promise.all([
    alumno ? supabase.from("grados").select("nombre").eq("id", alumno.grado_id).maybeSingle() : { data: null },
    alumno ? supabase.from("secciones").select("nombre").eq("id", alumno.seccion_id).maybeSingle() : { data: null },
  ]);

  return NextResponse.json({
    data: {
      resultado: resultado.resultado,
      motivo: resultado.motivo,
      estado: resultado.estado,
      alumno: alumno
        ? {
            id: alumno.id,
            nombre: `${alumno.nombres} ${alumno.apellidos}`,
            dni: alumno.dni,
            grado: grado?.nombre ?? "",
            seccion: seccion?.nombre ?? "",
          }
        : null,
      hora: new Date().toISOString(),
    },
  });
}
