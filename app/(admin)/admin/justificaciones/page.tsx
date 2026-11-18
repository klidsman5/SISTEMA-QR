import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { Badge, Card, DataTable, PageTitle } from "@/components/ui";
import { JustificarForm } from "@/features/justificaciones/JustificarForm";
import { RevertirForm } from "@/features/justificaciones/RevertirForm";

export default async function JustificacionesPage() {
  await requireRole(["administrador"]);
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("justificaciones")
    .select("id, fecha, tipo, nivel, motivo, observacion, estado, aprobado_en, alumnos(nombres, apellidos, dni)")
    .order("aprobado_en", { ascending: false })
    .limit(100);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Justificaciones"
        subtitle="Registra permisos previos o justificaciones posteriores. Cada cambio queda en historial."
      />

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Nueva justificación</h2>
        <JustificarForm />
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Últimas justificaciones</h2>
        <DataTable headers={["Alumno", "Fecha", "Tipo", "Nivel", "Motivo", "Estado", ""]}>
          {(data ?? []).map((j) => {
            const alumno = Array.isArray(j.alumnos) ? j.alumnos[0] : j.alumnos;
            return (
              <tr key={j.id}>
                <td className="px-2 py-3 font-medium">
                  {alumno ? `${alumno.apellidos}, ${alumno.nombres}` : "—"}
                </td>
                <td className="px-2 py-3">{j.fecha}</td>
                <td className="px-2 py-3">{j.tipo}</td>
                <td className="px-2 py-3">{j.nivel}</td>
                <td className="px-2 py-3 max-w-xs truncate">{j.motivo}</td>
                <td className="px-2 py-3">
                  <Badge tone={j.estado === "vigente" ? "info" : "neutral"}>{j.estado}</Badge>
                </td>
                <td className="px-2 py-3">{j.estado === "vigente" ? <RevertirForm id={j.id} /> : null}</td>
              </tr>
            );
          })}
        </DataTable>
        {(data ?? []).length === 0 ? (
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
            Todavía no hay justificaciones registradas.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
