import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { Badge, Button, Card, DataTable, Field, PageTitle, Select } from "@/components/ui";
import { crearGrado, crearSeccion, desactivarGrado, desactivarSeccion } from "@/features/admin/estructura/actions";
import { crearCurso, desactivarCurso } from "@/features/admin/cursos/actions";
import { haySolapamiento } from "@/lib/rules/solapamiento";
import type { Curso, Grado, Perfil, Seccion, Turno } from "@/types/database";

export default async function EstructuraPage() {
  await requireRole(["administrador"]);
  const supabase = await createSupabaseServerClient();

  const [{ data: grados }, { data: secciones }, { data: cursos }, { data: turnos }, { data: docentes }] =
    await Promise.all([
      supabase.from("grados").select("id, nombre, turno_id, hora_entrada, tolerancia_min, activo").order("nombre"),
      supabase.from("secciones").select("id, grado_id, nombre, activo").order("nombre"),
      supabase
        .from("cursos")
        .select("id, seccion_id, docente_id, nombre, hora_inicio, duracion_bloque_min, tolerancia_min, activo")
        .order("nombre"),
      supabase.from("turnos").select("id, nombre, hora_cierre").order("nombre"),
      supabase.from("usuarios").select("id, nombre, username, rol, activo").eq("rol", "docente").eq("activo", true),
    ]);

  const listaGrados = (grados as Grado[]) ?? [];
  const listaSecciones = (secciones as Seccion[]) ?? [];
  const listaCursos = (cursos as Curso[]) ?? [];
  const listaTurnos = (turnos as Turno[]) ?? [];
  const listaDocentes = (docentes as Perfil[]) ?? [];

  const nombreGrado = (id: string) => listaGrados.find((g) => g.id === id)?.nombre ?? "—";
  const nombreSeccion = (id: string) => listaSecciones.find((s) => s.id === id)?.nombre ?? "—";

  const docentesConSolapamiento = listaDocentes.filter((d) =>
    haySolapamiento(
      listaCursos
        .filter((c) => c.docente_id === d.id && c.activo)
        .map((c) => ({ horaInicio: c.hora_inicio.slice(0, 5), duracionMin: c.duracion_bloque_min })),
    ),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Estructura académica"
        subtitle="Grados, secciones y cursos. El Docente sólo verá los cursos que tenga asignados."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Nuevo grado</h2>
          <form action={crearGrado} className="grid gap-3 sm:grid-cols-2">
            <Field label="Nombre" name="nombre" required placeholder="4to" />
            <Select label="Turno" name="turno_id" required>
              {listaTurnos.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </Select>
            <Field label="Hora de entrada" name="hora_entrada" type="time" required defaultValue="07:30" />
            <Field label="Tolerancia (min)" name="tolerancia_min" type="number" min={0} max={120} defaultValue={10} />
            <div className="sm:col-span-2">
              <Button>Crear grado</Button>
            </div>
          </form>
        </Card>

        <Card>
          <h2 className="mb-4 text-lg font-semibold">Nueva sección</h2>
          <form action={crearSeccion} className="grid gap-3 sm:grid-cols-2">
            <Select label="Grado" name="grado_id" required>
              {listaGrados.filter((g) => g.activo).map((g) => (
                <option key={g.id} value={g.id}>
                  {g.nombre}
                </option>
              ))}
            </Select>
            <Field label="Sección" name="nombre" required placeholder="C" />
            <div className="sm:col-span-2">
              <Button>Crear sección</Button>
            </div>
          </form>
        </Card>
      </div>

      {docentesConSolapamiento.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Advertencia de horario:</strong>{" "}
          {docentesConSolapamiento.map((d) => d.nombre).join(", ")}{" "}
          tiene cursos con bloques que se solapan. Revisa los horarios en{" "}
          <a className="font-medium underline" href="/admin/horarios">
            Horarios
          </a>
          .
        </div>
      ) : null}

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Nuevo curso</h2>
        <form action={crearCurso} className="grid gap-3 sm:grid-cols-3">
          <Select label="Sección" name="seccion_id" required>
            {listaSecciones.filter((s) => s.activo).map((s) => (
              <option key={s.id} value={s.id}>
                {nombreGrado(s.grado_id)} {s.nombre}
              </option>
            ))}
          </Select>
          <Field label="Curso" name="nombre" required placeholder="Matemática" />
          <Select label="Docente" name="docente_id">
            <option value="">Sin asignar</option>
            {listaDocentes.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nombre}
              </option>
            ))}
          </Select>
          <Field label="Hora de inicio" name="hora_inicio" type="time" required defaultValue="08:00" />
          <Field label="Duración (min)" name="duracion_bloque_min" type="number" min={20} max={180} defaultValue={45} />
          <Field label="Tolerancia (min)" name="tolerancia_min" type="number" min={0} max={60} defaultValue={5} />
          <div className="sm:col-span-3">
            <Button>Crear curso</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Grados y secciones</h2>
        <DataTable headers={["Grado", "Turno", "Entrada", "Tolerancia", "Estado", ""]}>
          {listaGrados.map((g) => (
            <tr key={g.id}>
              <td className="px-2 py-3 font-medium">{g.nombre}</td>
              <td className="px-2 py-3">{listaTurnos.find((t) => t.id === g.turno_id)?.nombre ?? "—"}</td>
              <td className="px-2 py-3">{g.hora_entrada?.slice(0, 5)}</td>
              <td className="px-2 py-3">{g.tolerancia_min} min</td>
              <td className="px-2 py-3">
                <Badge tone={g.activo ? "success" : "danger"}>{g.activo ? "Activo" : "Inactivo"}</Badge>
              </td>
              <td className="px-2 py-3">
                {g.activo ? (
                  <form action={desactivarGrado}>
                    <input type="hidden" name="id" value={g.id} />
                    <Button variant="danger">Desactivar</Button>
                  </form>
                ) : null}
              </td>
            </tr>
          ))}
        </DataTable>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {listaSecciones.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <span>
                {nombreGrado(s.grado_id)} {s.nombre}{" "}
                <Badge tone={s.activo ? "success" : "danger"}>{s.activo ? "Activa" : "Inactiva"}</Badge>
              </span>
              {s.activo ? (
                <form action={desactivarSeccion}>
                  <input type="hidden" name="id" value={s.id} />
                  <Button variant="ghost">Desactivar</Button>
                </form>
              ) : null}
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-4 text-lg font-semibold">Cursos</h2>
        <DataTable headers={["Curso", "Sección", "Docente", "Inicio", "Duración", "Estado", ""]}>
          {listaCursos.map((c) => (
            <tr key={c.id}>
              <td className="px-2 py-3 font-medium">{c.nombre}</td>
              <td className="px-2 py-3">
                {nombreGrado(listaSecciones.find((s) => s.id === c.seccion_id)?.grado_id ?? "")} {nombreSeccion(c.seccion_id)}
              </td>
              <td className="px-2 py-3">
                {listaDocentes.find((d) => d.id === c.docente_id)?.nombre ?? (
                  <Badge tone="warning">Sin asignar</Badge>
                )}
              </td>
              <td className="px-2 py-3">{c.hora_inicio?.slice(0, 5)}</td>
              <td className="px-2 py-3">{c.duracion_bloque_min} min</td>
              <td className="px-2 py-3">
                <Badge tone={c.activo ? "success" : "danger"}>{c.activo ? "Activo" : "Inactivo"}</Badge>
              </td>
              <td className="px-2 py-3">
                {c.activo ? (
                  <form action={desactivarCurso}>
                    <input type="hidden" name="id" value={c.id} />
                    <Button variant="danger">Desactivar</Button>
                  </form>
                ) : null}
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}
