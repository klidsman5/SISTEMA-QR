import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { Badge, Button, Card, DataTable, Field, PageTitle } from "@/components/ui";
import { crearTurno } from "@/features/admin/horarios/turnos-actions";
import { finDeBloque } from "@/lib/rules/horario";
import type { Curso, Grado, Seccion, Turno } from "@/types/database";

export default async function HorariosPage() {
  await requireRole(["administrador"]);
  const supabase = await createSupabaseServerClient();

  const [{ data: turnos }, { data: grados }, { data: secciones }, { data: cursos }] = await Promise.all([
    supabase.from("turnos").select("id, nombre, hora_cierre").order("nombre"),
    supabase.from("grados").select("id, nombre, turno_id, hora_entrada, tolerancia_min, activo").order("nombre"),
    supabase.from("secciones").select("id, grado_id, nombre, activo"),
    supabase
      .from("cursos")
      .select("id, seccion_id, docente_id, nombre, hora_inicio, duracion_bloque_min, tolerancia_min, activo"),
  ]);

  const listaTurnos = (turnos as Turno[]) ?? [];
  const listaGrados = (grados as Grado[]) ?? [];
  const listaSecciones = (secciones as Seccion[]) ?? [];
  const listaCursos = (cursos as Curso[]) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Horarios"
        subtitle="Entrada por grado y bloques por curso. La duración del bloque se usa para solapamientos y cierres."
      />

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Nuevo turno</h2>
        <form action={crearTurno} className="grid gap-3 sm:grid-cols-3">
          <Field label="Nombre" name="nombre" required placeholder="noche" />
          <Field label="Hora de cierre" name="hora_cierre" type="time" required />
          <div className="flex items-end">
            <Button>Crear turno</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Turnos</h2>
        <DataTable headers={["Turno", "Cierre", "Grados"]}>
          {listaTurnos.map((t) => (
            <tr key={t.id}>
              <td className="px-2 py-3 font-medium capitalize">{t.nombre}</td>
              <td className="px-2 py-3">{t.hora_cierre?.slice(0, 5)}</td>
              <td className="px-2 py-3">
                {listaGrados.filter((g) => g.turno_id === t.id).map((g) => g.nombre).join(", ") || "—"}
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Entrada por grado</h2>
        <DataTable headers={["Grado", "Turno", "Entrada", "Tolerancia", "Estado"]}>
          {listaGrados.map((g) => (
            <tr key={g.id}>
              <td className="px-2 py-3 font-medium">{g.nombre}</td>
              <td className="px-2 py-3">{listaTurnos.find((t) => t.id === g.turno_id)?.nombre ?? "—"}</td>
              <td className="px-2 py-3">{g.hora_entrada?.slice(0, 5)}</td>
              <td className="px-2 py-3">{g.tolerancia_min} min</td>
              <td className="px-2 py-3">
                <Badge tone={g.activo ? "success" : "danger"}>{g.activo ? "Activo" : "Inactivo"}</Badge>
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Bloques por curso</h2>
        <DataTable headers={["Curso", "Sección", "Inicio", "Duración", "Fin", "Tolerancia"]}>
          {listaCursos.map((c) => (
            <tr key={c.id}>
              <td className="px-2 py-3 font-medium">{c.nombre}</td>
              <td className="px-2 py-3">
                {listaGrados.find(
                  (g) => g.id === listaSecciones.find((s) => s.id === c.seccion_id)?.grado_id,
                )?.nombre ?? ""}{" "}
                {listaSecciones.find((s) => s.id === c.seccion_id)?.nombre ?? "—"}
              </td>
              <td className="px-2 py-3">{c.hora_inicio?.slice(0, 5)}</td>
              <td className="px-2 py-3">{c.duracion_bloque_min} min</td>
              <td className="px-2 py-3">{finDeBloque(c.hora_inicio.slice(0, 5), c.duracion_bloque_min)}</td>
              <td className="px-2 py-3">{c.tolerancia_min} min</td>
            </tr>
          ))}
        </DataTable>
        <p className="mt-4 text-sm text-slate-600">
          Los parámetros operativos (debounce, desfase de reloj, retención) se ajustan en{" "}
          <Link className="font-medium text-indigo-700 hover:underline" href="/admin/configuracion">
            Configuración
          </Link>
          .
        </p>
      </Card>
    </div>
  );
}
