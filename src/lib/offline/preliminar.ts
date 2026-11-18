import { calcularEstado } from "@/lib/rules/horario";

export function horaActualLocal(): string {
  const ahora = new Date();
  return `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;
}

export function estadoPreliminar(
  horaEntrada: string,
  toleranciaMin: number,
): "puntual" | "tardanza" {
  return calcularEstado(horaActualLocal(), horaEntrada, toleranciaMin);
}
