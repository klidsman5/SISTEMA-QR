import type { Rol } from "@/types/database";

export function puedeDesactivar(rol: Rol, administradoresActivos: number): boolean {
  if (rol !== "administrador") return true;
  return administradoresActivos > 1;
}

export function mensajeUltimoAdmin(rol: Rol, administradoresActivos: number): string | null {
  return puedeDesactivar(rol, administradoresActivos)
    ? null
    : "No se puede desactivar al último Administrador activo";
}
