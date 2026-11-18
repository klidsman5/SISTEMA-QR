import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { Badge, Button, Card, DataTable, Field, PageTitle } from "@/components/ui";
import type { EventoAuditoria } from "@/types/database";

const acciones: Record<string, string> = {
  insert: "Alta",
  update: "Edición",
  delete: "Borrado",
  deactivate: "Desactivación",
};

export default async function AuditoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string; usuario?: string }>;
}) {
  await requireRole(["administrador"]);
  const filtros = await searchParams;
  const supabase = await createSupabaseServerClient();

  let query = supabase
    .from("auditoria")
    .select("id, usuario_id, accion, entidad, entidad_id, valor_anterior, valor_nuevo, fecha")
    .order("fecha", { ascending: false })
    .limit(200);

  if (filtros.desde) query = query.gte("fecha", `${filtros.desde}T00:00:00`);
  if (filtros.hasta) query = query.lte("fecha", `${filtros.hasta}T23:59:59`);
  if (filtros.usuario) query = query.eq("usuario_id", filtros.usuario);

  const [{ data }, { data: usuarios }] = await Promise.all([
    query,
    supabase.from("usuarios").select("id, nombre").order("nombre"),
  ]);

  const eventos = (data as EventoAuditoria[]) ?? [];
  const nombres = new Map((usuarios ?? []).map((u) => [u.id, u.nombre]));

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Auditoría" subtitle="Últimos 200 cambios administrativos, con valor anterior y nuevo." />

      <Card>
        <form className="grid gap-3 sm:grid-cols-4">
          <Field label="Desde" name="desde" type="date" defaultValue={filtros.desde} />
          <Field label="Hasta" name="hasta" type="date" defaultValue={filtros.hasta} />
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Usuario</span>
            <select
              name="usuario"
              defaultValue={filtros.usuario ?? ""}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2"
            >
              <option value="">Todos</option>
              {(usuarios ?? []).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nombre}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end">
            <Button>Filtrar</Button>
          </div>
        </form>
      </Card>

      <Card>
        <DataTable headers={["Fecha", "Usuario", "Acción", "Entidad", "Detalle"]}>
          {eventos.map((e) => (
            <tr key={e.id}>
              <td className="px-2 py-3 whitespace-nowrap">{new Date(e.fecha).toLocaleString("es-PE")}</td>
              <td className="px-2 py-3">{e.usuario_id ? nombres.get(e.usuario_id) ?? "—" : "Sistema"}</td>
              <td className="px-2 py-3">
                <Badge tone={e.accion === "deactivate" ? "warning" : e.accion === "delete" ? "danger" : "info"}>
                  {acciones[e.accion] ?? e.accion}
                </Badge>
              </td>
              <td className="px-2 py-3">{e.entidad}</td>
              <td className="px-2 py-3 text-xs text-slate-500">
                {e.valor_nuevo ? JSON.stringify(e.valor_nuevo).slice(0, 120) : "—"}
              </td>
            </tr>
          ))}
        </DataTable>
        {eventos.length === 0 ? (
          <p className="mt-4 rounded-lg bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
            No hay eventos para los filtros elegidos.
          </p>
        ) : null}
      </Card>
    </div>
  );
}
