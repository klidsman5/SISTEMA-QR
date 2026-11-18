import { z } from "zod";

export const justificacionCreateSchema = z
  .object({
    alumno_id: z.string().uuid().optional(),
    dni: z.string().trim().min(5).max(20).optional(),
    tipo: z.enum(["previo", "posterior"]),
    nivel: z.enum(["puerta", "aula", "ambos"]).default("ambos"),
    fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Usa AAAA-MM-DD"),
    motivo: z.string().trim().min(3, "El motivo es obligatorio").max(200),
    observacion: z.string().trim().min(3, "La observación es obligatoria").max(500),
  })
  .refine((v) => Boolean(v.alumno_id || v.dni), { message: "Indica el alumno por DNI" });

export const reversionSchema = z.object({
  motivo: z.string().trim().min(3, "Explica el motivo de la reversión").max(200),
});

export type JustificacionCreateInput = z.infer<typeof justificacionCreateSchema>;
