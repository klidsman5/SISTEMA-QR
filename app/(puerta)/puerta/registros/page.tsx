import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { Badge, Card, DataTable, PageTitle } from "@/components/ui";

export default async function RegistrosPage() {
  await requireRole(["auxiliar_puerta", "administrador"]);
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("asistencias_puerta")
    .select("id, fecha, hora_dispositivo, estado, origen, alumnos(nombres, apellidos, dni, grado_id, seccion_id)")
    .order("hora_dispositivo", { ascending: false })
    .limit(200);

  const filas = (data ?? []) as unknown as Array<{
    id: string;
    hora_dispositivo: string;
    estado: string;
    origen: string;
    alumnos:
      | { nombres: string; apellidos: string; dni: string }
      | Array<{ nombres: string; apellidos: string; dni: string }>
      | null;
  }>;

  const conteo = filas.reduce<Record<string, number>>((acc, f) => {
    acc[f.estado] = (acc[f.estado] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Registros del día" subtitle={`${filas.length} registros visibles para tu usuario.`} />

      <div className="flex flex-wrap gap-2">
        <Badge tone="success">Puntual: {conteo.puntual ?? 0}</Badge>
        <Badge tone="warning">Tardanza: {conteo.tardanza ?? 0}</Badge>
        <Badge tone="danger">Falta: {conteo.falta ?? 0}</Badge>
        <Badge tone="info">Justificado: {conteo.justificado ?? 0}</Badge>
      </div>

      <Card>
        <DataTable headers={["Hora", "Alumno", "DNI", "Estado", "Origen"]}>
          {filas.map((f) => {
            const alumno = Array.isArray(f.alumnos) ? f.alumnos[0] : f.alumnos;
            return (
            <tr key={f.id}>
              <td className="px-2 py-3 tabular-nums">
                {new Date(f.hora_dispositivo).toLocaleTimeString("es-PE")}
              </td>
              <td className="px-2 py-3 font-medium">
                {alumno ? `${alumno.apellidos}, ${alumno.nombres}` : "—"}
              </td>
              <td className="px-2 py-3">{alumno?.dni ?? "—"}</td>
              <td className="px-2 py-3">
                <Badge
                  tone={
                    f.estado === "puntual"
                      ? "success"
                      : f.estado === "tardanza"
                        ? "warning"
                        : f.estado === "falta"
                          ? "danger"
                          : "info"
                  }
                >
                  {f.estado}
                </Badge>
              </td>
              <td className="px-2 py-3 text-slate-600">{f.origen}</td>
            </tr>
            );
          })}
        </DataTable>
        {filas.length === 0 ? (
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
            Aún no hay registros. Escanea la primera credencial.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
