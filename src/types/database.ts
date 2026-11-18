export type Rol = "administrador" | "auxiliar_puerta" | "docente";

export interface Perfil {
  id: string;
  auth_user_id: string | null;
  nombre: string;
  username: string;
  rol: Rol;
  activo: boolean;
  debe_cambiar_password: boolean;
}

export interface Turno {
  id: string;
  nombre: string;
  hora_cierre: string;
}

export interface Grado {
  id: string;
  nombre: string;
  turno_id: string;
  hora_entrada: string;
  tolerancia_min: number;
  activo: boolean;
}

export interface Seccion {
  id: string;
  grado_id: string;
  nombre: string;
  activo: boolean;
}

export interface Curso {
  id: string;
  seccion_id: string;
  docente_id: string | null;
  nombre: string;
  hora_inicio: string;
  duracion_bloque_min: number;
  tolerancia_min: number;
  activo: boolean;
}

export interface EventoAuditoria {
  id: string;
  usuario_id: string | null;
  accion: string;
  entidad: string;
  entidad_id: string | null;
  valor_anterior: Record<string, unknown> | null;
  valor_nuevo: Record<string, unknown> | null;
  fecha: string;
}
