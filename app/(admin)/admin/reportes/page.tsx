import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { Badge, Card, DataTable, PageTitle } from "@/components/ui";
import { filtrosDesdeParams, rangoPorDefecto } from "@/features/reportes/filters";
import { consultarDetalle } from "@/features/reportes/query";

const estados = ["puntual", "tardanza", "falta", "justificado"] as const;

export default async function ReportesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole(["administrador"]);
  const params = await searchParams;
  const defaults = rangoPorDefecto();
  const filtros = filtrosDesdeParams(
    new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]),
  );
  const desde = filtros.desde ?? defaults.desde;
  const hasta = filtros.hasta ?? defaults.hasta;

  const supabase = await createSupabaseServerClient();
  const detalle = await consultarDetalle(supabase, { ...filtros, desde, hasta });
  const [{ data: grados }, { data: secciones }, { data: cursos }] = await Promise.all([
    supabase.from("grados").select("id, nombre").order("nombre"),
    supabase.from("secciones").select("id, grado_id, nombre").order("nombre"),
    supabase.from("cursos").select("id, nombre, seccion_id").order("nombre"),
  ]);

  const nombreGrado = new Map((grados ?? []).map((g) => [g.id, g.nombre]));
  const nombreSeccion = new Map((secciones ?? []).map((s) => [s.id, s.nombre]));

  const query = new URLSearchParams({ desde, hasta });
  for (const clave of ["nivel", "estado", "grado", "seccion", "curso", "alumno"] as const) {
    if (params[clave]) query.set(clave, params[clave]!);
  }

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Reportes"
        subtitle={`${detalle.length} registros entre ${desde} y ${hasta}.`}
      />

      <Card>
        <form className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Desde</span>
            <input type="date" name="desde" defaultValue={desde} className="rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Hasta</span>
            <input type="date" name="hasta" defaultValue={hasta} className="rounded-lg border border-slate-300 px-3 py-2" />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Grado</span>
            <select name="grado" defaultValue={params.grado ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="">Todos</option>
              {(grados ?? []).map((g) => (
                <option key={g.id} value={g.id}>{g.nombre}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Sección</span>
            <select name="seccion" defaultValue={params.seccion ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="">Todas</option>
              {(secciones ?? []).map((s) => (
                <option key={s.id} value={s.id}>{nombreGrado.get(s.grado_id)} {s.nombre}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Curso</span>
            <select name="curso" defaultValue={params.curso ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="">Todos</option>
              {(cursos ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Nivel</span>
            <select name="nivel" defaultValue={params.nivel ?? ""} className="rounded-lg border border-slate-300 bg-white px-3 py-2">
              <option value="">Ambos</option>
              <option value="puerta">Puerta</option>
              <option value="aula">Aula</option>
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
          <div className="flex items-end">
            <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              Filtrar
            </button>
          </div>
        </form>

        <div className="mt-4 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
          <a
            href={`/api/reports/attendance?formato=xlsx&${query.toString()}`}
            className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Descargar Excel
          </a>
          <a
            href={`/api/reports/attendance?formato=pdf&${query.toString()}`}
            className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            Descargar PDF
          </a>
        </div>
      </Card>

      <Card>
        <DataTable headers={["Fecha", "Hora", "Alumno", "Grado", "Sección", "Curso", "Nivel", "Estado"]}>
          {detalle.slice(0, 200).map((d) => (
            <tr key={`${d.nivel}-${d.id}`}>
              <td className="px-2 py-3">{d.fecha}</td>
              <td className="px-2 py-3 tabular-nums">{d.hora.slice(11, 16)}</td>
              <td className="px-2 py-3 font-medium">{d.apellidos}, {d.nombres}</td>
              <td className="px-2 py-3">{d.grado_id ? nombreGrado.get(d.grado_id) ?? "—" : "—"}</td>
              <td className="px-2 py-3">{d.seccion_id ? nombreSeccion.get(d.seccion_id) ?? "—" : "—"}</td>
              <td className="px-2 py-3">{d.curso ?? "—"}</td>
              <td className="px-2 py-3">{d.nivel}</td>
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
          ))}
        </DataTable>
        {detalle.length === 0 ? (
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
            No hay registros con esos filtros.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
