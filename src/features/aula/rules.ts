import { calcularEstado } from "@/lib/rules/horario";

export function estadoAula(
  horaEvento: string,
  horaInicioSesion: string,
  toleranciaMin: number,
): "puntual" | "tardanza" {
  return calcularEstado(horaEvento, horaInicioSesion, toleranciaMin);
}

export function puedeRegistrarEnSesion(params: {
  alumnoSeccionId: string;
  cursoSeccionId: string;
  sesionAbierta: boolean;
}): { ok: boolean; motivo?: string } {
  if (!params.sesionAbierta) return { ok: false, motivo: "sesion_cerrada" };
  if (params.alumnoSeccionId !== params.cursoSeccionId) {
    return { ok: false, motivo: "fuera_de_seccion" };
  }
  return { ok: true };
}
