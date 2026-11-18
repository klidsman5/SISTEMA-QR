import { getDb, type EventoPendiente, type PadronCache } from "./db";

export interface EventoNuevo {
  evento_id: string;
  tipo: "puerta" | "aula";
  payload: Record<string, unknown>;
  hora_dispositivo?: string;
}

export async function encolar(evento: EventoNuevo): Promise<void> {
  const db = getDb();
  await db.eventos.put({
    evento_id: evento.evento_id,
    tipo: evento.tipo,
    payload: evento.payload,
    hora_dispositivo: evento.hora_dispositivo ?? new Date().toISOString(),
    creado_en: new Date().toISOString(),
    estado: "pendiente",
    intentos: 0,
  });
}

export async function pendientes(limite = 200): Promise<EventoPendiente[]> {
  const db = getDb();
  return db.eventos.orderBy("creado_en").limit(limite).toArray();
}

export async function contarPendientes(): Promise<number> {
  const db = getDb();
  return db.eventos.count();
}

export async function marcarIntentando(ids: string[]): Promise<void> {
  const db = getDb();
  await db.transaction("rw", db.eventos, async () => {
    for (const id of ids) {
      const evento = await db.eventos.get(id);
      if (!evento) continue;
      await db.eventos.update(id, { estado: "enviando", intentos: evento.intentos + 1 });
    }
  });
}

export async function quitar(id: string): Promise<void> {
  await getDb().eventos.delete(id);
}

export async function marcarFallido(id: string, error: string): Promise<void> {
  const db = getDb();
  const evento = await db.eventos.get(id);
  if (!evento) return;
  await db.eventos.update(id, { estado: "fallido", ultimo_error: error });
}

export async function guardarPadron(filas: PadronCache[]): Promise<void> {
  const db = getDb();
  await db.transaction("rw", db.padron, async () => {
    await db.padron.clear();
    await db.padron.bulkPut(filas.map((f) => ({ ...f, actualizado_en: new Date().toISOString() })));
  });
}

export async function buscarCredencial(qrUuid: string): Promise<PadronCache | undefined> {
  return getDb().padron.get(qrUuid);
}
