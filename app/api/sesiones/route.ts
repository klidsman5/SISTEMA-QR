import { NextResponse } from "next/server";
import { z } from "zod";
import { getPerfilActual } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const bodySchema = z.object({ curso_id: z.string().uuid() });

export async function GET(request: Request) {
  const perfil = await getPerfilActual();
  if (!perfil || !["docente", "administrador"].includes(perfil.rol)) {
    return NextResponse.json({ error: { code: "SIN_PERMISO", message: "Sin acceso" } }, { status: 403 });
  }

  const url = new URL(request.url);
  const fecha = url.searchParams.get("fecha") ?? new Date().toISOString().slice(0, 10);
  const supabase = await createSupabaseServerClient();

  const { data: sesiones, error } = await supabase
    .from("sesiones_clase")
    .select("id, curso_id, fecha, estado, abierta_en, cerrada_en, hora_inicio_aplicada, tolerancia_aplicada")
    .eq("fecha", fecha)
    .order("abierta_en", { ascending: false });

  if (error) {
    return NextResponse.json({ error: { code: "VALIDACION", message: error.message } }, { status: 422 });
  }

  return NextResponse.json({ data: sesiones ?? [] });
}

export async function POST(request: Request) {
  const perfil = await getPerfilActual();
  if (!perfil || !["docente", "administrador"].includes(perfil.rol)) {
    return NextResponse.json({ error: { code: "SIN_PERMISO", message: "Sin acceso" } }, { status: 403 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: { code: "VALIDACION", message: "Curso inválido" } }, { status: 422 });
  }

  const supabase = await createSupabaseServerClient();
  const { data: curso } = await supabase
    .from("cursos")
    .select("id, docente_id, hora_inicio, tolerancia_min, seccion_id, activo")
    .eq("id", parsed.data.curso_id)
    .single();

  if (!curso || !curso.activo) {
    return NextResponse.json({ error: { code: "VALIDACION", message: "Curso no disponible" } }, { status: 422 });
  }

  if (perfil.rol === "docente" && curso.docente_id !== perfil.id) {
    return NextResponse.json({ error: { code: "SIN_PERMISO", message: "Curso ajeno" } }, { status: 403 });
  }

  const docenteId = curso.docente_id ?? perfil.id;
  const { data, error } = await supabase
    .from("sesiones_clase")
    .insert({
      curso_id: curso.id,
      docente_id: docenteId,
      fecha: new Date().toISOString().slice(0, 10),
      hora_inicio_aplicada: curso.hora_inicio,
      tolerancia_aplicada: curso.tolerancia_min,
    })
    .select("id")
    .single();

  if (error) {
    const mensaje = error.code === "23505" ? "Ya hay una sesión abierta para este curso" : error.message;
    return NextResponse.json({ error: { code: "VALIDACION", message: mensaje } }, { status: 409 });
  }

  return NextResponse.json({ data: { id: data.id } }, { status: 201 });
}
