import { NextResponse } from "next/server";
import { z } from "zod";
import { getPerfilActual } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({
  sesion_id: z.string().uuid(),
  qr_uuid: z.string().uuid(),
  evento_id: z.string().uuid().optional(),
  hora_dispositivo: z.string().datetime().optional(),
  dispositivo_id: z.string().max(80).optional(),
});

export async function POST(request: Request) {
  const perfil = await getPerfilActual();
  if (!perfil || !["docente", "administrador"].includes(perfil.rol)) {
    return NextResponse.json({ error: { code: "SIN_PERMISO", message: "Sin acceso" } }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: "VALIDACION", message: parsed.error.issues[0]?.message } },
      { status: 422 },
    );
  }

  const supabase = await createSupabaseServerClient();
  const { data: contexto } = await supabase
    .from("credenciales")
    .select("alumno_id, alumnos(id, dni, nombres, apellidos, grado_id, seccion_id)")
    .eq("qr_uuid", parsed.data.qr_uuid)
    .eq("estado", "vigente")
    .maybeSingle();

  if (!contexto) {
    return NextResponse.json(
      { error: { code: "CREDENCIAL_INVALIDA", message: "Credencial desconocida o revocada" } },
      { status: 409 },
    );
  }

  const { data, error } = await supabase.rpc("registrar_asistencia_curso", {
    p_evento: {
      evento_id: parsed.data.evento_id ?? crypto.randomUUID(),
      sesion_id: parsed.data.sesion_id,
      qr_uuid: parsed.data.qr_uuid,
      hora_dispositivo: parsed.data.hora_dispositivo ?? new Date().toISOString(),
      dispositivo_id: parsed.data.dispositivo_id ?? "web-aula",
    },
  });

  if (error) {
    return NextResponse.json({ error: { code: "VALIDACION", message: error.message } }, { status: 422 });
  }

  const resultado = data as { resultado: string; motivo?: string; estado?: string };

  const mensajes: Record<string, string> = {
    credencial_revocada: "Credencial revocada",
    fuera_de_seccion: "El alumno no pertenece a esta sección",
    sesion_cerrada: "La sesión está cerrada",
    alumno_de_baja: "Alumno dado de baja",
  };

  if (resultado.resultado === "invalido") {
    return NextResponse.json(
      {
        error: {
          code: resultado.motivo?.toUpperCase() ?? "CREDENCIAL_INVALIDA",
          message: mensajes[resultado.motivo ?? ""] ?? "No se pudo registrar",
        },
      },
      { status: 409 },
    );
  }

  const alumno = Array.isArray(contexto.alumnos) ? contexto.alumnos[0] : contexto.alumnos;

  return NextResponse.json({
    data: {
      resultado: resultado.resultado,
      motivo: resultado.motivo,
      estado: resultado.estado,
      alumno: alumno ? { nombre: `${alumno.nombres} ${alumno.apellidos}`, dni: alumno.dni } : null,
      hora: new Date().toISOString(),
    },
  });
}
