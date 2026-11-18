import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { Badge, Card, DataTable, PageTitle } from "@/components/ui";
import { JustificarForm } from "@/features/justificaciones/JustificarForm";

export default async function JustificacionesAulaPage({
  searchParams,
}: {
  searchParams: Promise<{ alumno?: string; fecha?: string }>;
}) {
  const params = await searchParams;
  await requireRole(["docente", "administrador"]);
  const supabase = await createSupabaseServerClient();

  const { data: sesiones } = await supabase.from("sesiones_clase").select("id, fecha");
  const ids = (sesiones ?? []).map((s) => s.id);

  const { data: pendientes } = await supabase
    .from("asistencias_curso")
    .select("id, sesion_id, alumno_id, fecha, estado, alumnos(nombres, apellidos, dni)")
    .in("sesion_id", ids.length > 0 ? ids : ["00000000-0000-0000-0000-000000000000"])
    .in("estado", ["falta", "tardanza"])
    .order("fecha", { ascending: false })
    .limit(50);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Justificaciones de mis cursos"
        subtitle="Puedes justificar faltas y tardanzas de tus propios cursos."
      />

      <Card>
        <h2 className="mb-4 text-lg font-semibold">
          {params.alumno ? "Justificar registro" : "Nueva justificación"}
        </h2>
        <JustificarForm alumnoId={params.alumno} fecha={params.fecha} />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Faltas y tardanzas pendientes</h2>
        <DataTable headers={["Alumno", "Fecha", "Estado", ""]}>
          {(pendientes ?? []).map((p) => {
            const alumno = Array.isArray(p.alumnos) ? p.alumnos[0] : p.alumnos;
            return (
              <tr key={p.id}>
                <td className="px-2 py-3 font-medium">
                  {alumno ? `${alumno.apellidos}, ${alumno.nombres}` : "—"}
                </td>
                <td className="px-2 py-3">{p.fecha}</td>
                <td className="px-2 py-3">
                  <Badge tone={p.estado === "falta" ? "danger" : "warning"}>{p.estado}</Badge>
                </td>
                <td className="px-2 py-3">
                  <Link
                    href={`/aula/justificaciones?alumno=${p.alumno_id}&fecha=${p.fecha}`}
                    className="text-sm font-medium text-teal-700 underline"
                  >
                    Justificar
                  </Link>
                </td>
              </tr>
            );
          })}
        </DataTable>
        {(pendientes ?? []).length === 0 ? (
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
            No hay faltas ni tardanzas pendientes en tus cursos.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
