export type EstadoAsistencia = "puntual" | "tardanza";

export function horaAMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m) || h > 23 || m > 59) {
    throw new Error(`Hora inválida: ${hora}`);
  }
  return h * 60 + m;
}

export function minutosAHora(minutos: number): string {
  const normalizado = ((minutos % 1440) + 1440) % 1440;
  const h = Math.floor(normalizado / 60);
  const m = normalizado % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function calcularEstado(
  horaEvento: string,
  horaEntrada: string,
  toleranciaMin: number,
): EstadoAsistencia {
  const limite = horaAMinutos(horaEntrada) + toleranciaMin;
  return horaAMinutos(horaEvento) <= limite ? "puntual" : "tardanza";
}

export function finDeBloque(horaInicio: string, duracionMin: number): string {
  return minutosAHora(horaAMinutos(horaInicio) + duracionMin);
}

export function bloqueValido(horaInicio: string, duracionMin: number): boolean {
  return horaAMinutos(horaInicio) + duracionMin <= 24 * 60;
}
