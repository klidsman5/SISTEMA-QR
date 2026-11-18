import { marcarFallido, marcarIntentando, pendientes, quitar } from "./queue";

export function dividirLote<T>(elementos: T[], tamano = 200): T[][] {
  const lotes: T[][] = [];
  for (let i = 0; i < elementos.length; i += tamano) {
    lotes.push(elementos.slice(i, i + tamano));
  }
  return lotes;
}

export interface ResultadoSync {
  sincronizados: number;
  pendientes: number;
  error?: string;
}

export async function sincronizar(dispositivoId = "web"): Promise<ResultadoSync> {
  const pendientesActuales = await pendientes(200);
  if (pendientesActuales.length === 0) return { sincronizados: 0, pendientes: 0 };

  await marcarIntentando(pendientesActuales.map((e) => e.evento_id));

  try {
    const respuesta = await fetch("/api/sync/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        dispositivo_id: dispositivoId,
        eventos: pendientesActuales.map((e) => ({
          evento_id: e.evento_id,
          tipo: e.tipo,
          hora_dispositivo: e.hora_dispositivo,
          payload: e.payload,
        })),
      }),
    });

    if (!respuesta.ok) {
      const json = await respuesta.json().catch(() => null);
      const mensaje = json?.error?.message ?? "Error de sincronización";
      for (const evento of pendientesActuales) await marcarFallido(evento.evento_id, mensaje);
      return { sincronizados: 0, pendientes: pendientesActuales.length, error: mensaje };
    }

    const json = (await respuesta.json()) as {
      data: { resultados: Array<{ evento_id: string; resultado: string }> };
    };

    let sincronizados = 0;
    for (const r of json.data.resultados) {
      if (["aplicado", "reconciliado", "duplicado", "descartado"].includes(r.resultado)) {
        await quitar(r.evento_id);
        sincronizados += 1;
      } else {
        await marcarFallido(r.evento_id, r.resultado);
      }
    }

    return { sincronizados, pendientes: (await pendientes(200)).length };
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : "Sin conexión";
    for (const evento of pendientesActuales) await marcarFallido(evento.evento_id, mensaje);
    return { sincronizados: 0, pendientes: pendientesActuales.length, error: mensaje };
  }
}
