import { describe, expect, it } from "vitest";
import { usuarioCreateSchema, usuarioUpdateSchema } from "@/features/admin/usuarios/schema";

describe("usuarioCreateSchema", () => {
  it("acepta una cuenta válida", () => {
    const parsed = usuarioCreateSchema.safeParse({
      nombre: "Ana Torres",
      username: "ana.torres",
      rol: "docente",
      password: "Clave1234",
    });
    expect(parsed.success).toBe(true);
  });

  it("rechaza usuario con espacios o símbolos no permitidos", () => {
    const parsed = usuarioCreateSchema.safeParse({
      nombre: "Ana",
      username: "ana torres!",
      rol: "docente",
      password: "Clave1234",
    });
    expect(parsed.success).toBe(false);
  });

  it("rechaza contraseñas de menos de 8 caracteres", () => {
    const parsed = usuarioCreateSchema.safeParse({
      nombre: "Ana",
      username: "ana",
      rol: "docente",
      password: "corta",
    });
    expect(parsed.success).toBe(false);
  });

  it("rechaza un rol fuera del catálogo", () => {
    const parsed = usuarioCreateSchema.safeParse({
      nombre: "Ana",
      username: "ana",
      rol: "apoderado",
      password: "Clave1234",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("usuarioUpdateSchema", () => {
  it("exige un uuid válido", () => {
    const parsed = usuarioUpdateSchema.safeParse({
      id: "no-es-uuid",
      nombre: "Ana",
      rol: "docente",
    });
    expect(parsed.success).toBe(false);
  });
});
