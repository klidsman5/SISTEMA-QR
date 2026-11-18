-- Módulo 006: justificaciones y permisos previos.
create table if not exists public.justificaciones (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.alumnos (id) on delete cascade,
  tipo text not null check (tipo in ('previo', 'posterior')),
  nivel text not null default 'ambos' check (nivel in ('puerta', 'aula', 'ambos')),
  referencia_asistencia_id uuid,
  fecha date not null,
  motivo text not null check (length(trim(motivo)) >= 3),
  observacion text not null check (length(trim(observacion)) >= 3),
  aprobado_por uuid not null references public.usuarios (id),
  aprobado_en timestamptz not null default now(),
  estado text not null default 'vigente' check (estado in ('vigente', 'revertida')),
  created_at timestamptz not null default now()
);

create unique index if not exists justificacion_vigente_unica
  on public.justificaciones (alumno_id, fecha, nivel, coalesce(referencia_asistencia_id, '00000000-0000-0000-0000-000000000000'))
  where estado = 'vigente';

create index if not exists justificaciones_alumno_fecha_idx on public.justificaciones (alumno_id, fecha desc);

create table if not exists public.justificaciones_historial (
  id uuid primary key default gen_random_uuid(),
  justificacion_id uuid not null references public.justificaciones (id) on delete cascade,
  usuario_id uuid references public.usuarios (id),
  fecha timestamptz not null default now(),
  accion text not null,
  valor_anterior jsonb,
  valor_nuevo jsonb
);
