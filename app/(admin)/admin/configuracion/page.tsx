import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { Button, Card, Field, PageTitle } from "@/components/ui";
import { guardarParametros } from "@/features/admin/horarios/actions";
import { clavesParametros } from "@/features/admin/horarios/schema";
import { aplicarRetencionForm } from "@/features/admin/retencion/actions";

export default async function ConfiguracionPage() {
  await requireRole(["administrador"]);
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.from("configuracion").select("clave, valor, descripcion").order("clave");

  const valores = new Map((data ?? []).map((fila) => [fila.clave, fila.valor as number]));

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Configuración"
        subtitle="Parámetros operativos. Los cambios se aplican sin desplegar y quedan en auditoría."
      />

      <Card>
        <form action={guardarParametros} className="grid gap-4 sm:grid-cols-2">
          {clavesParametros.map((p) => (
            <Field
              key={p.clave}
              label={p.descripcion}
              name={p.clave}
              type="number"
              min={1}
              max={3650}
              required
              defaultValue={valores.get(p.clave) ?? 5}
            />
          ))}
          <div className="sm:col-span-2">
            <Button>Guardar parámetros</Button>
          </div>
        </form>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-slate-900">Retención y exportación</h2>
        <p className="mt-2 text-sm text-slate-600">
          Exporta el periodo antes de eliminar. Sin la palabra CONFIRMAR no se borra nada. La
          exportación incluye los eventos de auditoría del rango.
        </p>

        <form className="mt-4 grid gap-3 sm:grid-cols-3" action="/api/admin/retencion/export" method="get">
          <Field label="Desde" name="desde" type="date" required />
          <Field label="Hasta" name="hasta" type="date" required />
          <div className="flex items-end">
            <Button variant="ghost">Exportar CSV</Button>
          </div>
        </form>

        <form action={aplicarRetencionForm} className="mt-6 grid gap-3 border-t border-slate-200 pt-6 sm:grid-cols-3">
          <Field label="Eliminar anteriores a" name="hasta" type="date" required />
          <Field label="Escribe CONFIRMAR" name="confirmacion" required placeholder="CONFIRMAR" />
          <div className="flex items-end">
            <Button variant="danger">Aplicar retención</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
