import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { Badge, Button, Card, DataTable, Field, PageTitle } from "@/components/ui";
import { darBajaAusentes } from "@/features/admin/padron/actions";

export default async function PadronPage() {
  await requireRole(["administrador"]);
  const supabase = await createSupabaseServerClient();

  const [{ count: total }, { count: activos }, { data: alumnos }, { data: grados }, { data: secciones }] =
    await Promise.all([
      supabase.from("alumnos").select("id", { count: "exact", head: true }),
      supabase.from("alumnos").select("id", { count: "exact", head: true }).eq("estado", "activo"),
      supabase
        .from("alumnos")
        .select("id, dni, nombres, apellidos, grado_id, seccion_id, anio_escolar, estado, foto_url")
        .order("apellidos")
        .limit(100),
      supabase.from("grados").select("id, nombre"),
      supabase.from("secciones").select("id, nombre"),
    ]);

  const nombreGrado = new Map((grados ?? []).map((g) => [g.id, g.nombre]));
  const nombreSeccion = new Map((secciones ?? []).map((s) => [s.id, s.nombre]));
  const anioActual = new Date().getFullYear();

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Padrón"
        subtitle={`${activos ?? 0} alumnos activos de ${total ?? 0} registrados.`}
      />

      <div className="flex flex-wrap gap-3">
        <Link
          href="/admin/padron/importar"
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Importar padrón
        </Link>
        <Link
          href="/admin/credenciales"
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Credenciales y carnets
        </Link>
      </div>

      <Card>
        <h2 className="mb-2 text-lg font-semibold">Cierre de año escolar</h2>
        <p className="mb-4 text-sm text-slate-600">
          Carga primero el padrón del año nuevo y después ejecuta la baja de ausentes. Los alumnos que
          no aparecen quedan de baja y sus credenciales se revocan, sin borrar su historial.
        </p>
        <form action={darBajaAusentes} className="flex flex-wrap items-end gap-3">
          <Field label="Año del padrón nuevo" name="anio" type="number" min={2000} max={2100} defaultValue={anioActual} required />
          <Button variant="danger">Dar de baja a los ausentes</Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Últimos 100 alumnos</h2>
        <DataTable headers={["Alumno", "DNI", "Grado", "Sección", "Año", "Estado"]}>
          {(alumnos ?? []).map((a) => (
            <tr key={a.id}>
              <td className="px-2 py-3 font-medium">
                {a.apellidos}, {a.nombres}
              </td>
              <td className="px-2 py-3">{a.dni}</td>
              <td className="px-2 py-3">{nombreGrado.get(a.grado_id) ?? "—"}</td>
              <td className="px-2 py-3">{nombreSeccion.get(a.seccion_id) ?? "—"}</td>
              <td className="px-2 py-3">{a.anio_escolar}</td>
              <td className="px-2 py-3">
                <Badge tone={a.estado === "activo" ? "success" : "danger"}>
                  {a.estado === "activo" ? "Activo" : "De baja"}
                </Badge>
              </td>
            </tr>
          ))}
        </DataTable>
        {(alumnos ?? []).length === 0 ? (
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
            Todavía no hay alumnos. Empieza con la importación del padrón.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
