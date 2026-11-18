import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { Card, PageTitle } from "@/components/ui";
import { AusentismoChart, TendenciaChart } from "@/features/dashboard/DashboardCharts";
import { porcentaje, rangoPorDefecto } from "@/features/reportes/filters";
import { consultarDetalle } from "@/features/reportes/query";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  await requireRole(["administrador"]);
  const params = await searchParams;
  const defaults = rangoPorDefecto();
  const desde = params.desde ?? defaults.desde;
  const hasta = params.hasta ?? defaults.hasta;

  const supabase = await createSupabaseServerClient();
  const detalle = await consultarDetalle(supabase, { desde, hasta });
  const { data: grados } = await supabase.from("grados").select("id, nombre");

  const total = detalle.length;
  const faltas = detalle.filter((d) => d.estado === "falta").length;
  const puntuales = detalle.filter((d) => d.estado === "puntual").length;
  const tardanzas = detalle.filter((d) => d.estado === "tardanza").length;

  const porDia = new Map<string, { total: number; presentes: number }>();
  const porGrado = new Map<string, { total: number; faltas: number }>();

  for (const d of detalle) {
    const dia = porDia.get(d.fecha) ?? { total: 0, presentes: 0 };
    dia.total += 1;
    if (d.estado !== "falta") dia.presentes += 1;
    porDia.set(d.fecha, dia);

    const g = porGrado.get(d.grado_id ?? "sin") ?? { total: 0, faltas: 0 };
    g.total += 1;
    if (d.estado === "falta") g.faltas += 1;
    porGrado.set(d.grado_id ?? "sin", g);
  }

  const nombreGrado = new Map((grados ?? []).map((g) => [g.id, g.nombre]));

  const kpis = [
    { titulo: "Asistencia", valor: porcentaje(total - faltas, total), color: "bg-emerald-100 text-emerald-700" },
    { titulo: "Puntualidad", valor: porcentaje(puntuales, total), color: "bg-indigo-100 text-indigo-700" },
    { titulo: "Tardanzas", valor: porcentaje(tardanzas, total), color: "bg-amber-100 text-amber-700" },
    { titulo: "Ausentismo", valor: porcentaje(faltas, total), color: "bg-rose-100 text-rose-700" },
  ];

  const tendencia = [...porDia.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([fecha, v]) => ({ fecha, asistencia: porcentaje(v.presentes, v.total) }));

  const ausentismo = [...porGrado.entries()].map(([gradoId, v]) => ({
    grado: nombreGrado.get(gradoId) ?? "—",
    ausentismo: porcentaje(v.faltas, v.total),
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Dashboard" subtitle={`Periodo ${desde} a ${hasta} · ${total} registros.`} />

      <form className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Desde</span>
          <input type="date" name="desde" defaultValue={desde} className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Hasta</span>
          <input type="date" name="hasta" defaultValue={hasta} className="rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <button className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          Aplicar
        </button>
      </form>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.titulo} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold ${k.color}`}>
              %
            </div>
            <p className="text-sm text-slate-600">{k.titulo}</p>
            <p className="text-3xl font-semibold text-slate-900">{k.valor}%</p>
            <div className="mt-3 h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-indigo-500 via-blue-500 to-cyan-400"
                style={{ width: `${Math.min(k.valor, 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Tendencia de asistencia</h2>
          <TendenciaChart datos={tendencia} />
        </Card>
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Ausentismo por grado</h2>
          <AusentismoChart datos={ausentismo} />
        </Card>
      </div>
    </div>
  );
}
