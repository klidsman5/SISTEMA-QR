import { z } from "zod";

export const filtrosReporteSchema = z.object({
  desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  alumno: z.string().uuid().optional(),
  grado: z.string().uuid().optional(),
  seccion: z.string().uuid().optional(),
  curso: z.string().uuid().optional(),
  nivel: z.enum(["puerta", "aula"]).optional(),
  estado: z.enum(["puntual", "tardanza", "falta", "justificado"]).optional(),
});

export type FiltrosReporte = z.infer<typeof filtrosReporteSchema>;

export function filtrosDesdeParams(params: URLSearchParams): FiltrosReporte {
  const crudo: Record<string, string> = {};
  for (const clave of ["desde", "hasta", "alumno", "grado", "seccion", "curso", "nivel", "estado"]) {
    const valor = params.get(clave);
    if (valor) crudo[clave] = valor;
  }
  const parsed = filtrosReporteSchema.safeParse(crudo);
  return parsed.success ? parsed.data : {};
}

export function rangoPorDefecto(): { desde: string; hasta: string } {
  const hasta = new Date();
  const desde = new Date(hasta);
  desde.setDate(desde.getDate() - 29);
  return { desde: desde.toISOString().slice(0, 10), hasta: hasta.toISOString().slice(0, 10) };
}

export function porcentaje(parte: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((parte / total) * 1000) / 10;
}
