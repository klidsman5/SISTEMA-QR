export interface FilaValida {
  fila: number;
  dni: string;
  nombres: string;
  apellidos: string;
  grado_id: string;
  seccion_id: string;
}

export interface FilaError {
  fila: number;
  campo: string;
  detalle: string;
}

export interface ResultadoPrevisualizacion {
  importId?: string;
  total: number;
  validas: FilaValida[];
  errores: FilaError[];
}

export type EstadoImportacion =
  | {
      ok?: string;
      error?: string;
      importId?: string;
      total?: number;
      validas?: number;
      errores?: FilaError[];
    }
  | null;
