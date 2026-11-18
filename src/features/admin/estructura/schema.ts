import { z } from "zod";

const horaSchema = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Usa el formato HH:MM (24 horas)");

export const gradoCreateSchema = z.object({
  nombre: z.string().trim().min(1, "El grado es obligatorio").max(30),
  turno_id: z.string().uuid("Selecciona un turno"),
  hora_entrada: horaSchema,
  tolerancia_min: z.coerce.number().int().min(0).max(120),
});

export const seccionCreateSchema = z.object({
  grado_id: z.string().uuid("Selecciona un grado"),
  nombre: z.string().trim().min(1, "La sección es obligatoria").max(10),
});

export const cursoCreateSchema = z.object({
  seccion_id: z.string().uuid("Selecciona una sección"),
  docente_id: z
    .string()
    .uuid("Selecciona un docente")
    .optional()
    .or(z.literal(""))
    .transform((v) => (v === "" ? null : v)),
  nombre: z.string().trim().min(2, "El curso es obligatorio").max(80),
  hora_inicio: horaSchema,
  duracion_bloque_min: z.coerce.number().int().min(20).max(180),
  tolerancia_min: z.coerce.number().int().min(0).max(60),
});
