import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { Badge, Card, DataTable, PageTitle } from "@/components/ui";
import { filtrosDesdeParams, rangoPorDefecto } from "@/features/reportes/filters";
import { consultarDetalle } from "@/features/reportes/query";

const estados = ["puntual", "tardanza", "falta", "justificado"] as const;

export default async function ReportesAulaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const perfil = await requireRole(["docente", "administrador"]);
  const params = await searchParams;
  const defaults = rangoPorDefecto();
  const filtros = filtrosDesdeParams(
    new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]),
  );
  const desde = filtros.desde ?? defaults.desde;
  const hasta = filtros.hasta ?? defaults.hasta;

  const supabase = await createSupabaseServerClient();

  let cursosQuery = supabase
    .from("cursos")
    .select("id, nombre, seccion_id")
    .eq("activo", true)
    .order("nombre");
  if (perfil.rol === "docente") cursosQuery = cursosQuery.eq("docente_id", perfil.id);

  const [{ data: cursos }, { data: grados }, { data: secciones }] = await Promise.all([
    cursosQuery,
    supabase.from("grados").select("id, nombre"),
    supabase.from("secciones").select("id, grado_id, nombre"),
  ]);

  const nombreGrado = new Map((grados ?? []).map((g) => [g.id, g.nombre]));
  const seccionPorId = new Map((secciones ?? []).map((s) => [s.id, s]));

  // Sólo nivel aula: la asistencia de puerta no pertenece al Docente.
  const detalle = await consultarDetalle(supabase, { ...filtros, desde, hasta, nivel: "aula" });

  const query = new URLSearchParams({ desde, hasta, nivel: "aula", formato: "xlsx" });
  if (params.estado) query.set("estado", params.estado);
  if (params.curso) query.set("curso", params.curso);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Reportes de mis cursos"
        subtitle={`${detalle.length} registros de aula entre ${desde} y ${hasta}. Sólo incluye tus cursos.`}
      />

      <Card>
        <form className="grid gap-3 sm:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Desde</span>
            <input type="date" name="desde" defaultValue={desde} className="rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Hasta</span>
            <input type="date" name="hasta" defaultValue={hasta} className="rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Curso</span>
            <select name="curso" defaultValue={params.curso ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="">Todos mis cursos</option>
              {(cursos ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Estado</span>
            <select name="estado" defaultValue={params.estado ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="">Todos</option>
              {estados.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
          </label>
          <div className="sm:col-span-4 flex flex-wrap gap-2">
            <button className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700">
              Filtrar
            </button>
            <a
              href={`/api/reports/attendance?${query.toString()}`}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Descargar Excel
            </a>
            <a
              href={`/api/reports/attendance?${query.toString().replace("formato=xlsx", "formato=pdf")}`}
              className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
            >
              Descargar PDF
            </a>
          </div>
        </form>
      </Card>

      <Card>
        <DataTable headers={["Fecha", "Hora", "Alumno", "Curso", "Sección", "Estado"]}>
          {detalle.slice(0, 200).map((d) => {
            const seccion = d.seccion_id ? seccionPorId.get(d.seccion_id) : undefined;
            return (
              <tr key={d.id}>
                <td className="px-2 py-3">{d.fecha}</td>
                <td className="px-2 py-3 tabular-nums">{d.hora.slice(11, 16)}</td>
                <td className="px-2 py-3 font-medium">{d.apellidos}, {d.nombres}</td>
                <td className="px-2 py-3">{d.curso ?? "—"}</td>
                <td className="px-2 py-3">
                  {seccion ? `${nombreGrado.get(seccion.grado_id) ?? ""} ${seccion.nombre}` : "—"}
                </td>
                <td className="px-2 py-3">
                  <Badge
                    tone={
                      d.estado === "puntual"
                        ? "success"
                        : d.estado === "tardanza"
                          ? "warning"
                          : d.estado === "falta"
                            ? "danger"
                            : "info"
                    }
                  >
                    {d.estado}
                  </Badge>
                </td>
              </tr>
            );
          })}
        </DataTable>
        {detalle.length === 0 ? (
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
            No hay registros de aula con esos filtros.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
