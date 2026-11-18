import Dexie, { type Table } from "dexie";

export interface EventoPendiente {
  evento_id: string;
  tipo: "puerta" | "aula";
  payload: Record<string, unknown>;
  hora_dispositivo: string;
  creado_en: string;
  estado: "pendiente" | "enviando" | "fallido";
  intentos: number;
  ultimo_error?: string;
}

export interface PadronCache {
  qr_uuid: string;
  alumno_id: string;
  nombre: string;
  grado: string;
  seccion: string;
  hora_entrada: string;
  tolerancia_min: number;
  actualizado_en: string;
}

class OfflineDB extends Dexie {
  eventos!: Table<EventoPendiente, string>;
  padron!: Table<PadronCache, string>;

  constructor() {
    super("asistencia_qr");
    this.version(1).stores({
      eventos: "evento_id, estado, creado_en",
      padron: "qr_uuid",
    });
  }
}

let instancia: OfflineDB | null = null;

export function getDb(): OfflineDB {
  if (typeof window === "undefined") {
    throw new Error("La base offline sólo existe en el navegador");
  }
  if (!instancia) instancia = new OfflineDB();
  return instancia;
}
