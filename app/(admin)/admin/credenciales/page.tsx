import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { Badge, Button, Card, DataTable, PageTitle } from "@/components/ui";
import { RevocarForm } from "@/features/admin/padron/RevocarForm";

export default async function CredencialesPage({
  searchParams,
}: {
  searchParams: Promise<{ grado?: string; seccion?: string }>;
}) {
  await requireRole(["administrador"]);
  const filtros = await searchParams;
  const supabase = await createSupabaseServerClient();

  const [{ data: grados }, { data: secciones }] = await Promise.all([
    supabase.from("grados").select("id, nombre").order("nombre"),
    supabase.from("secciones").select("id, grado_id, nombre").order("nombre"),
  ]);

  let query = supabase
    .from("alumnos")
    .select("id, dni, nombres, apellidos, grado_id, seccion_id")
    .eq("estado", "activo")
    .order("apellidos")
    .limit(300);

  if (filtros.grado) query = query.eq("grado_id", filtros.grado);
  if (filtros.seccion) query = query.eq("seccion_id", filtros.seccion);

  const { data: alumnos } = await query;

  const { data: credenciales } = await supabase
    .from("credenciales")
    .select("alumno_id, qr_uuid, estado, anio_escolar")
    .eq("estado", "vigente")
    .in("alumno_id", (alumnos ?? []).map((a) => a.id).length > 0 ? (alumnos ?? []).map((a) => a.id) : ["00000000-0000-0000-0000-000000000000"]);

  const credencialPorAlumno = new Map((credenciales ?? []).map((c) => [c.alumno_id, c]));
  const nombreGrado = new Map((grados ?? []).map((g) => [g.id, g.nombre]));
  const nombreSeccion = new Map((secciones ?? []).map((s) => [s.id, s.nombre]));

  const pdfQuery = new URLSearchParams();
  if (filtros.grado) pdfQuery.set("grado", filtros.grado);
  if (filtros.seccion) pdfQuery.set("seccion", filtros.seccion);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Credenciales"
        subtitle="Genera carnets en PDF y revoca credenciales perdidas o reemitidas."
      />

      <Card>
        <form className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Grado</span>
            <select name="grado" defaultValue={filtros.grado ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="">Todos</option>
              {(grados ?? []).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Sección</span>
            <select name="seccion" defaultValue={filtros.seccion ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="">Todas</option>
              {(secciones ?? [])
                .filter((s) => !filtros.grado || s.grado_id === filtros.grado)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {nombreGrado.get(s.grado_id)} {s.nombre}
                  </option>
                ))}
            </select>
          </label>

          <Button>Filtrar</Button>
          <a
            href={`/api/admin/credenciales/pdf?${pdfQuery.toString()}`}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Descargar PDF
          </a>
        </form>
      </Card>

      <Card>
        <DataTable headers={["Alumno", "DNI", "Grado", "Sección", "Credencial", "Acciones"]}>
          {(alumnos ?? []).map((a) => {
            const credencial = credencialPorAlumno.get(a.id);
            return (
              <tr key={a.id}>
                <td className="px-2 py-3 font-medium">
                  {a.apellidos}, {a.nombres}
                </td>
                <td className="px-2 py-3">{a.dni}</td>
                <td className="px-2 py-3">{nombreGrado.get(a.grado_id) ?? "—"}</td>
                <td className="px-2 py-3">{nombreSeccion.get(a.seccion_id) ?? "—"}</td>
                <td className="px-2 py-3">
                  {credencial ? (
                    <Badge tone="success">Vigente {credencial.anio_escolar}</Badge>
                  ) : (
                    <Badge tone="danger">Sin credencial</Badge>
                  )}
                </td>
                <td className="px-2 py-3">
                  <RevocarForm alumnoId={a.id} />
                </td>
              </tr>
            );
          })}
        </DataTable>
        {(alumnos ?? []).length === 0 ? (
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
            No hay alumnos para estos filtros.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
