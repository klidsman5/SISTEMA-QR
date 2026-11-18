import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { Badge, Card, DataTable, PageTitle } from "@/components/ui";
import { OpenSessionButton } from "@/features/aula/OpenSessionButton";

export default async function AulaPage() {
  const perfil = await requireRole(["docente", "administrador"]);
  const supabase = await createSupabaseServerClient();
  const hoy = new Date().toISOString().slice(0, 10);

  let cursosQuery = supabase
    .from("cursos")
    .select("id, nombre, seccion_id, docente_id, hora_inicio, duracion_bloque_min, tolerancia_min, activo")
    .eq("activo", true)
    .order("hora_inicio");

  if (perfil.rol === "docente") cursosQuery = cursosQuery.eq("docente_id", perfil.id);

  const [{ data: cursos }, { data: secciones }, { data: grados }, { data: sesiones }] = await Promise.all([
    cursosQuery,
    supabase.from("secciones").select("id, grado_id, nombre"),
    supabase.from("grados").select("id, nombre"),
    supabase.from("sesiones_clase").select("id, curso_id, estado").eq("fecha", hoy),
  ]);

  const nombreGrado = new Map((grados ?? []).map((g) => [g.id, g.nombre]));
  const seccionPorId = new Map((secciones ?? []).map((s) => [s.id, s]));
  const sesionPorCurso = new Map((sesiones ?? []).map((s) => [s.curso_id, s]));

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Mis cursos"
        subtitle="Abre la sesión de la clase y escanea las credenciales de tus alumnos."
      />

      <Card>
        <DataTable headers={["Curso", "Sección", "Horario", "Sesión de hoy"]}>
          {(cursos ?? []).map((c) => {
            const seccion = seccionPorId.get(c.seccion_id);
            const sesion = sesionPorCurso.get(c.id);
            return (
              <tr key={c.id}>
                <td className="px-2 py-3 font-medium">{c.nombre}</td>
                <td className="px-2 py-3">
                  {seccion ? `${nombreGrado.get(seccion.grado_id) ?? ""} ${seccion.nombre}` : "—"}
                </td>
                <td className="px-2 py-3">
                  {c.hora_inicio.slice(0, 5)} · {c.duracion_bloque_min} min
                </td>
                <td className="px-2 py-3">
                  {sesion ? (
                    sesion.estado === "abierta" ? (
                      <div className="flex items-center gap-3">
                        <Badge tone="success">Abierta</Badge>
                        <a className="text-sm font-medium text-teal-700 underline" href={`/aula/${sesion.id}`}>
                          Continuar
                        </a>
                      </div>
                    ) : (
                      <Badge tone="neutral">Cerrada hoy</Badge>
                    )
                  ) : (
                    <OpenSessionButton cursoId={c.id} abierta={false} />
                  )}
                </td>
              </tr>
            );
          })}
        </DataTable>
        {(cursos ?? []).length === 0 ? (
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
            No tienes cursos asignados. Pide al Administrador que te asigne uno.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
