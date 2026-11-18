-- Módulo 008: descartes y revisiones de sincronización.
create table if not exists public.eventos_descartados (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null unique,
  contexto text not null,
  alumno_id uuid references public.alumnos (id),
  motivo text not null,
  ocurrido_en timestamptz,
  recibido_en timestamptz not null default now(),
  dispositivo_id text
);

alter table public.eventos_descartados enable row level security;

drop policy if exists descartados_select on public.eventos_descartados;
drop policy if exists descartados_insert on public.eventos_descartados;
create policy descartados_select on public.eventos_descartados
  for select to authenticated using (public.es_administrador());
create policy descartados_insert on public.eventos_descartados
  for insert to authenticated with check (true);

create table if not exists public.revisiones (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null unique,
  asistencia_id uuid,
  nivel text not null check (nivel in ('puerta', 'aula')),
  motivo text not null default 'desfase_reloj',
  estado text not null default 'pendiente' check (estado in ('pendiente', 'aceptada', 'anulada')),
  resuelto_por uuid references public.usuarios (id),
  resuelto_en timestamptz,
  created_at timestamptz not null default now()
);

alter table public.revisiones enable row level security;

drop policy if exists revisiones_select on public.revisiones;
drop policy if exists revisiones_write on public.revisiones;
create policy revisiones_select on public.revisiones
  for select to authenticated using (public.es_administrador());
create policy revisiones_write on public.revisiones
  for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());
