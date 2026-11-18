import { horaAMinutos } from "./horario";

export interface Bloque {
  horaInicio: string;
  duracionMin: number;
}

export function bloquesSeSolapan(a: Bloque, b: Bloque): boolean {
  const inicioA = horaAMinutos(a.horaInicio);
  const finA = inicioA + a.duracionMin;
  const inicioB = horaAMinutos(b.horaInicio);
  const finB = inicioB + b.duracionMin;

  return inicioA < finB && inicioB < finA;
}

export function haySolapamiento(bloques: Bloque[]): boolean {
  for (let i = 0; i < bloques.length; i += 1) {
    for (let j = i + 1; j < bloques.length; j += 1) {
      if (bloquesSeSolapan(bloques[i], bloques[j])) return true;
    }
  }
  return false;
}
