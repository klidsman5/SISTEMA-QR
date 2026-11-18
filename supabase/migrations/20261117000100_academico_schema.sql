-- Módulo 002: estructura académica y cuentas.
create extension if not exists citext;
create extension if not exists pgcrypto;

do $$
begin
  create type public.rol_usuario as enum ('administrador', 'auxiliar_puerta', 'docente');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users (id) on delete cascade,
  nombre text not null,
  username citext not null unique,
  rol public.rol_usuario not null default 'docente',
  activo boolean not null default true,
  debe_cambiar_password boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint usuarios_username_largo check (char_length(username) between 3 and 40)
);

create table if not exists public.turnos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  hora_cierre time not null,
  created_at timestamptz not null default now()
);

create table if not exists public.grados (
  id uuid primary key default gen_random_uuid(),
  nombre text not null unique,
  turno_id uuid not null references public.turnos (id),
  hora_entrada time not null,
  tolerancia_min integer not null default 10 check (tolerancia_min between 0 and 120),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.secciones (
  id uuid primary key default gen_random_uuid(),
  grado_id uuid not null references public.grados (id),
  nombre text not null,
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (grado_id, nombre)
);

create table if not exists public.cursos (
  id uuid primary key default gen_random_uuid(),
  seccion_id uuid not null references public.secciones (id),
  docente_id uuid references public.usuarios (id),
  nombre text not null,
  hora_inicio time not null,
  duracion_bloque_min integer not null default 45 check (duracion_bloque_min between 20 and 180),
  tolerancia_min integer not null default 5 check (tolerancia_min between 0 and 60),
  activo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.auditoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.usuarios (id),
  accion text not null,
  entidad text not null,
  entidad_id uuid,
  valor_anterior jsonb,
  valor_nuevo jsonb,
  fecha timestamptz not null default now()
);

create index if not exists auditoria_entidad_idx on public.auditoria (entidad, entidad_id, fecha desc);
create index if not exists auditoria_usuario_idx on public.auditoria (usuario_id, fecha desc);
create index if not exists cursos_docente_idx on public.cursos (docente_id) where activo;
create index if not exists grados_turno_idx on public.grados (turno_id);
