import { z } from "zod";

export const rolSchema = z.enum(["administrador", "auxiliar_puerta", "docente"]);

const usernameSchema = z
  .string()
  .trim()
  .min(3, "El usuario debe tener al menos 3 caracteres")
  .max(40, "El usuario no puede superar 40 caracteres")
  .regex(/^[a-z0-9._-]+$/i, "Sólo letras, números, punto, guion y guion bajo");

export const usuarioCreateSchema = z.object({
  nombre: z.string().trim().min(3, "El nombre es obligatorio").max(120),
  username: usernameSchema,
  rol: rolSchema,
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres").max(72),
});

export const usuarioUpdateSchema = z.object({
  id: z.string().uuid(),
  nombre: z.string().trim().min(3, "El nombre es obligatorio").max(120),
  rol: rolSchema,
});

export type UsuarioCreateInput = z.infer<typeof usuarioCreateSchema>;
