import { z } from "zod";

export const registrarEntradaSchema = z
  .object({
    qr_uuid: z.string().uuid().optional(),
    alumno_id: z.string().uuid().optional(),
    dni: z.string().trim().optional(),
    motivo: z.string().trim().max(200).optional(),
    evento_id: z.string().uuid().optional(),
    hora_dispositivo: z.string().datetime().optional(),
    dispositivo_id: z.string().max(80).optional(),
    origen: z.enum(["escaneo", "manual"]).default("escaneo"),
  })
  .refine((v) => Boolean(v.qr_uuid || v.alumno_id || v.dni), {
    message: "Envía qr_uuid, alumno_id o dni",
  })
  .refine((v) => v.origen !== "manual" || Boolean(v.motivo && v.motivo.length >= 3), {
    message: "El registro manual exige motivo",
  });

export const cerrarJornadaSchema = z.object({
  turno_id: z.string().uuid(),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export type RegistrarEntradaInput = z.infer<typeof registrarEntradaSchema>;
