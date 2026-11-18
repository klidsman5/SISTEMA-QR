-- Módulo 004: asistencia de puerta.
create table if not exists public.asistencias_puerta (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null unique,
  alumno_id uuid not null references public.alumnos (id) on delete cascade,
  matricula_id uuid references public.matriculas (id),
  fecha date not null,
  hora_dispositivo timestamptz not null,
  recibido_en timestamptz not null default now(),
  estado text not null check (estado in ('puntual', 'tardanza', 'falta', 'justificado')),
  hora_entrada_aplicada time not null,
  tolerancia_aplicada integer not null,
  origen text not null default 'escaneo' check (origen in ('escaneo', 'manual', 'permiso', 'cierre')),
  motivo_manual text,
  dispositivo_id text,
  registrado_por uuid references public.usuarios (id),
  requiere_revision boolean not null default false,
  actualizada_en timestamptz,
  created_at timestamptz not null default now(),
  unique (alumno_id, fecha),
  constraint puerta_motivo_manual check (origen <> 'manual' or length(coalesce(motivo_manual, '')) > 0)
);

create index if not exists puerta_fecha_estado_idx on public.asistencias_puerta (fecha, estado);
create index if not exists puerta_registrado_por_idx on public.asistencias_puerta (registrado_por, fecha);
create index if not exists puerta_alumno_idx on public.asistencias_puerta (alumno_id, fecha);

create table if not exists public.cierres_jornada (
  id uuid primary key default gen_random_uuid(),
  turno_id uuid not null references public.turnos (id),
  fecha date not null,
  ejecutado_por uuid references public.usuarios (id),
  ejecutado_en timestamptz not null default now(),
  total_faltas integer not null default 0,
  total_exceptuados integer not null default 0,
  unique (turno_id, fecha)
);
