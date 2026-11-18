-- Asistencia QR: esquema inicial para Supabase en la nube.
-- Ejecutar UNA VEZ en un proyecto nuevo (SQL Editor). No es idempotente en las políticas.

-- ============================================================
-- supabase/migrations/20261117000100_academico_schema.sql
-- ============================================================
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


-- ============================================================
-- supabase/migrations/20261117000110_rls_helpers.sql
-- ============================================================
-- Funciones de contexto y políticas RLS del módulo 002.
create or replace function public.rol_actual()
returns public.rol_usuario
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.usuarios
  where auth_user_id = auth.uid() and activo
  limit 1;
$$;

create or replace function public.usuario_id_actual()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.usuarios
  where auth_user_id = auth.uid() and activo
  limit 1;
$$;

create or replace function public.es_administrador()
returns boolean
language sql
stable
as $$ select public.rol_actual() = 'administrador'; $$;

alter table public.usuarios enable row level security;
alter table public.turnos enable row level security;
alter table public.grados enable row level security;
alter table public.secciones enable row level security;
alter table public.cursos enable row level security;
alter table public.auditoria enable row level security;

-- usuarios: cada quien ve su fila; el Administrador ve y administra todas.
create policy usuarios_select on public.usuarios
  for select to authenticated
  using (id = public.usuario_id_actual() or public.es_administrador());

create policy usuarios_update on public.usuarios
  for update to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

create policy usuarios_insert on public.usuarios
  for insert to authenticated
  with check (public.es_administrador());

-- estructura: lectura para todo el personal autenticado; escritura sólo Administrador.
create policy turnos_select on public.turnos
  for select to authenticated using (true);
create policy turnos_write on public.turnos
  for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

create policy grados_select on public.grados
  for select to authenticated using (true);
create policy grados_write on public.grados
  for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

create policy secciones_select on public.secciones
  for select to authenticated using (true);
create policy secciones_write on public.secciones
  for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

create policy cursos_select on public.cursos
  for select to authenticated
  using (public.es_administrador() or docente_id = public.usuario_id_actual());
create policy cursos_write on public.cursos
  for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

-- auditoría: lectura del Administrador; escritura sólo por funciones security definer.
create policy auditoria_select on public.auditoria
  for select to authenticated using (public.es_administrador());


-- ============================================================
-- supabase/migrations/20261117000200_crear_usuario.sql
-- ============================================================
-- Perfil creado por el Administrador después de crear la cuenta en Supabase Auth.
create or replace function public.crear_perfil(
  p_auth_id uuid,
  p_nombre text,
  p_username citext,
  p_rol public.rol_usuario
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.es_administrador() then
    raise exception 'SIN_PERMISO' using errcode = '42501';
  end if;

  insert into public.usuarios (auth_user_id, nombre, username, rol)
  values (p_auth_id, p_nombre, p_username, p_rol)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.crear_perfil(uuid, text, citext, public.rol_usuario) from public;
grant execute on function public.crear_perfil(uuid, text, citext, public.rol_usuario) to authenticated;

-- Restablecimiento: sólo Administrador; la clave la fija Supabase Auth desde el servidor.
create or replace function public.marcar_cambio_password(p_usuario uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_administrador() then
    raise exception 'SIN_PERMISO' using errcode = '42501';
  end if;
  update public.usuarios set debe_cambiar_password = true, updated_at = now() where id = p_usuario;
end;
$$;

grant execute on function public.marcar_cambio_password(uuid) to authenticated;


-- ============================================================
-- supabase/migrations/20261117000250_duracion_bloque.sql
-- ============================================================
-- El bloque de un curso debe empezar y terminar dentro del mismo día.
alter table public.cursos
  drop constraint if exists cursos_bloque_en_dia;

alter table public.cursos
  add constraint cursos_bloque_en_dia
  check (
    duracion_bloque_min between 20 and 180
    and (hora_inicio + make_interval(mins => duracion_bloque_min))::time > hora_inicio
  );


-- ============================================================
-- supabase/migrations/20261117000300_curso_docente_check.sql
-- ============================================================
-- Un curso sólo se asigna a un usuario con rol docente y activo.
create or replace function public.validar_docente_curso()
returns trigger
language plpgsql
as $$
declare
  v_rol public.rol_usuario;
  v_activo boolean;
begin
  if new.docente_id is null then
    return new;
  end if;

  select rol, activo into v_rol, v_activo
  from public.usuarios where id = new.docente_id;

  if v_rol is null or v_rol <> 'docente' or not coalesce(v_activo, false) then
    raise exception 'DOCENTE_INVALIDO' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validar_docente_curso on public.cursos;
create trigger trg_validar_docente_curso
  before insert or update of docente_id on public.cursos
  for each row execute function public.validar_docente_curso();


-- ============================================================
-- supabase/migrations/20261117000400_solapamiento.sql
-- ============================================================
-- Cursos de un mismo docente cuyos bloques se solapan.
create or replace function public.cursos_solapados(p_docente uuid)
returns table (
  curso_a uuid,
  curso_b uuid,
  inicio_a time,
  fin_a time,
  inicio_b time,
  fin_b time
)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, b.id,
         a.hora_inicio,
         (a.hora_inicio + make_interval(mins => a.duracion_bloque_min))::time,
         b.hora_inicio,
         (b.hora_inicio + make_interval(mins => b.duracion_bloque_min))::time
  from public.cursos a
  join public.cursos b
    on a.docente_id = b.docente_id
   and a.id < b.id
   and a.activo and b.activo
  where a.docente_id = p_docente
    and a.hora_inicio < (b.hora_inicio + make_interval(mins => b.duracion_bloque_min))::time
    and b.hora_inicio < (a.hora_inicio + make_interval(mins => a.duracion_bloque_min))::time;
$$;

grant execute on function public.cursos_solapados(uuid) to authenticated;


-- ============================================================
-- supabase/migrations/20261117000500_auditoria.sql
-- ============================================================
-- Auditoría automática de la estructura y las cuentas.
create or replace function public.registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_accion text;
  v_anterior jsonb;
  v_nuevo jsonb;
begin
  if tg_op = 'INSERT' then
    v_accion := 'insert';
  elsif tg_op = 'DELETE' then
    v_accion := 'delete';
  elsif tg_op = 'UPDATE' and (to_jsonb(old) ->> 'activo') = 'true'
        and (to_jsonb(new) ->> 'activo') = 'false' then
    v_accion := 'deactivate';
  else
    v_accion := 'update';
  end if;

  v_anterior := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  v_nuevo := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;

  insert into public.auditoria (usuario_id, accion, entidad, entidad_id, valor_anterior, valor_nuevo)
  values (public.usuario_id_actual(), v_accion, tg_table_name,
          coalesce((to_jsonb(new) ->> 'id')::uuid, (to_jsonb(old) ->> 'id')::uuid),
          v_anterior, v_nuevo);

  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['usuarios', 'turnos', 'grados', 'secciones', 'cursos']
  loop
    execute format('drop trigger if exists trg_auditoria on public.%I', t);
    execute format(
      'create trigger trg_auditoria after insert or update or delete on public.%I
       for each row execute function public.registrar_auditoria()', t);
  end loop;
end $$;


-- ============================================================
-- supabase/migrations/20261117000600_configuracion.sql
-- ============================================================
-- Parámetros operativos editables por el Administrador.
create table if not exists public.configuracion (
  clave text primary key,
  valor jsonb not null,
  descripcion text,
  updated_at timestamptz not null default now()
);

insert into public.configuracion (clave, valor, descripcion) values
  ('debounce_puerta_min', '5'::jsonb, 'Ventana de enfriamiento de puerta en minutos'),
  ('desfase_reloj_min', '5'::jsonb, 'Desfase de reloj tolerado en minutos'),
  ('duracion_bloque_min', '45'::jsonb, 'Duración de bloque por defecto en minutos'),
  ('retencion_dias', '365'::jsonb, 'Días de retención del historial')
on conflict (clave) do nothing;

alter table public.configuracion enable row level security;

create policy configuracion_select on public.configuracion
  for select to authenticated using (true);

create policy configuracion_write on public.configuracion
  for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

drop trigger if exists trg_auditoria on public.configuracion;
create trigger trg_auditoria
  after insert or update or delete on public.configuracion
  for each row execute function public.registrar_auditoria();


-- ============================================================
-- supabase/seed.sql
-- ============================================================
-- Datos mínimos de desarrollo.
insert into public.turnos (nombre, hora_cierre) values
  ('mañana', '12:30'),
  ('tarde', '18:00')
on conflict (nombre) do nothing;

insert into public.grados (nombre, turno_id, hora_entrada, tolerancia_min)
select '3ro', t.id, '07:30', 10
from public.turnos t
where t.nombre = 'mañana'
on conflict (nombre) do nothing;

insert into public.secciones (grado_id, nombre)
select g.id, s.nombre
from public.grados g
cross join (values ('A'), ('B')) as s(nombre)
where g.nombre = '3ro'
on conflict (grado_id, nombre) do nothing;

insert into public.configuracion (clave, valor, descripcion) values
  ('debounce_puerta_min', '5'::jsonb, 'Ventana de enfriamiento de puerta en minutos'),
  ('desfase_reloj_min', '5'::jsonb, 'Desfase de reloj tolerado en minutos'),
  ('duracion_bloque_min', '45'::jsonb, 'Duración de bloque por defecto en minutos'),
  ('retencion_dias', '365'::jsonb, 'Días de retención del historial')
on conflict (clave) do nothing;


