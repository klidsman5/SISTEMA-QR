import { z } from "zod";

export const parametrosSchema = z.object({
  debounce_puerta_min: z.coerce.number().int().min(1).max(60),
  desfase_reloj_min: z.coerce.number().int().min(1).max(60),
  duracion_bloque_min: z.coerce.number().int().min(20).max(180),
  retencion_dias: z.coerce.number().int().min(30).max(3650),
});

export type Parametros = z.infer<typeof parametrosSchema>;

export const clavesParametros: Array<{ clave: keyof Parametros; descripcion: string }> = [
  { clave: "debounce_puerta_min", descripcion: "Ventana de enfriamiento de puerta (min)" },
  { clave: "desfase_reloj_min", descripcion: "Desfase de reloj tolerado (min)" },
  { clave: "duracion_bloque_min", descripcion: "Duración de bloque por defecto (min)" },
  { clave: "retencion_dias", descripcion: "Retención del historial (días)" },
];
