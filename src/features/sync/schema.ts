import { z } from "zod";

export const eventoBatchSchema = z.object({
  evento_id: z.string().uuid(),
  tipo: z.enum(["puerta", "aula"]),
  hora_dispositivo: z.string().datetime(),
  payload: z.record(z.unknown()),
});

export const batchSchema = z.object({
  dispositivo_id: z.string().max(80).default("web"),
  eventos: z.array(eventoBatchSchema).min(1).max(200),
});

export type EventoBatch = z.infer<typeof eventoBatchSchema>;
