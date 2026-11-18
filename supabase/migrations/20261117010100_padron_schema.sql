-- Módulo 003: padrón, matrículas e credenciales.
create table if not exists public.alumnos (
  id uuid primary key default gen_random_uuid(),
  dni citext not null unique,
  nombres text not null,
  apellidos text not null,
  grado_id uuid not null references public.grados (id),
  seccion_id uuid not null references public.secciones (id),
  anio_escolar integer not null,
  estado text not null default 'activo' check (estado in ('activo', 'de_baja')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists alumnos_seccion_idx on public.alumnos (seccion_id, apellidos);
create index if not exists alumnos_anio_estado_idx on public.alumnos (anio_escolar, estado);

create table if not exists public.matriculas (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.alumnos (id) on delete cascade,
  anio_escolar integer not null,
  grado_id uuid not null references public.grados (id),
  seccion_id uuid not null references public.secciones (id),
  created_at timestamptz not null default now(),
  unique (alumno_id, anio_escolar)
);

create table if not exists public.credenciales (
  id uuid primary key default gen_random_uuid(),
  alumno_id uuid not null references public.alumnos (id) on delete cascade,
  qr_uuid uuid not null unique default gen_random_uuid(),
  anio_escolar integer not null,
  estado text not null default 'vigente' check (estado in ('vigente', 'revocada')),
  emitida_en timestamptz not null default now(),
  revocada_en timestamptz,
  motivo_revocacion text
);

create unique index if not exists credencial_vigente_por_alumno
  on public.credenciales (alumno_id)
  where estado = 'vigente';

create index if not exists credenciales_qr_idx on public.credenciales (qr_uuid);

create table if not exists public.importaciones (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.usuarios (id),
  archivo text not null,
  anio_escolar integer not null,
  total_filas integer not null default 0,
  filas_validas integer not null default 0,
  filas_error integer not null default 0,
  detalle jsonb not null default '{}'::jsonb,
  estado text not null default 'preview'
    check (estado in ('preview', 'confirmada', 'fallida')),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 minutes'
);

create index if not exists importaciones_estado_idx on public.importaciones (estado, created_at desc);
