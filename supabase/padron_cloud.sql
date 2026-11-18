-- Modulo 003: padron y credenciales. Seguro de reejecutar.
-- ============================================================
-- supabase/migrations/20261117010100_padron_schema.sql
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


-- ============================================================
-- supabase/migrations/20261117010110_padron_rls.sql
-- RLS del padrón: lectura para el personal autenticado, escritura sólo Administrador.
-- Idempotente: se puede volver a ejecutar sin chocar con políticas existentes.
alter table public.alumnos enable row level security;
alter table public.matriculas enable row level security;
alter table public.credenciales enable row level security;
alter table public.importaciones enable row level security;

drop policy if exists alumnos_select on public.alumnos;
drop policy if exists alumnos_write on public.alumnos;
create policy alumnos_select on public.alumnos
  for select to authenticated using (true);
create policy alumnos_write on public.alumnos
  for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

drop policy if exists matriculas_select on public.matriculas;
drop policy if exists matriculas_write on public.matriculas;
create policy matriculas_select on public.matriculas
  for select to authenticated using (true);
create policy matriculas_write on public.matriculas
  for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

drop policy if exists credenciales_select on public.credenciales;
drop policy if exists credenciales_write on public.credenciales;
create policy credenciales_select on public.credenciales
  for select to authenticated using (true);
create policy credenciales_write on public.credenciales
  for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

drop policy if exists importaciones_select on public.importaciones;
drop policy if exists importaciones_write on public.importaciones;
create policy importaciones_select on public.importaciones
  for select to authenticated using (public.es_administrador());
create policy importaciones_write on public.importaciones
  for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

notify pgrst, 'reload schema';


-- ============================================================
-- supabase/migrations/20261117010200_padron_funciones.sql
-- Importación transaccional, revocación y bajas del ciclo anual.
create or replace function public.importar_alumnos(p_anio integer, p_alumnos jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_fila jsonb;
  v_alumno uuid;
  v_creados integer := 0;
  v_actualizados integer := 0;
  v_credenciales integer := 0;
  v_existia boolean;
begin
  if not public.es_administrador() then
    raise exception 'SIN_PERMISO' using errcode = '42501';
  end if;

  for v_fila in select * from jsonb_array_elements(p_alumnos)
  loop
    select id into v_alumno from public.alumnos where dni = (v_fila ->> 'dni');
    v_existia := v_alumno is not null;

    if v_existia then
      update public.alumnos
         set nombres = v_fila ->> 'nombres',
             apellidos = v_fila ->> 'apellidos',
             grado_id = (v_fila ->> 'grado_id')::uuid,
             seccion_id = (v_fila ->> 'seccion_id')::uuid,
             anio_escolar = p_anio,
             estado = 'activo',
             updated_at = now()
       where id = v_alumno;
      v_actualizados := v_actualizados + 1;
    else
      insert into public.alumnos (dni, nombres, apellidos, grado_id, seccion_id, anio_escolar)
      values (
        v_fila ->> 'dni', v_fila ->> 'nombres', v_fila ->> 'apellidos',
        (v_fila ->> 'grado_id')::uuid, (v_fila ->> 'seccion_id')::uuid, p_anio
      )
      returning id into v_alumno;
      v_creados := v_creados + 1;
    end if;

    insert into public.matriculas (alumno_id, anio_escolar, grado_id, seccion_id)
    values (v_alumno, p_anio, (v_fila ->> 'grado_id')::uuid, (v_fila ->> 'seccion_id')::uuid)
    on conflict (alumno_id, anio_escolar) do update
      set grado_id = excluded.grado_id,
          seccion_id = excluded.seccion_id;

    if not exists (
      select 1 from public.credenciales
      where alumno_id = v_alumno and anio_escolar = p_anio and estado = 'vigente'
    ) then
      update public.credenciales
         set estado = 'revocada', revocada_en = now(), motivo_revocacion = 'reemision_anual'
       where alumno_id = v_alumno and estado = 'vigente';

      insert into public.credenciales (alumno_id, anio_escolar)
      values (v_alumno, p_anio);
      v_credenciales := v_credenciales + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'creados', v_creados,
    'actualizados', v_actualizados,
    'credenciales', v_credenciales
  );
end;
$$;

revoke all on function public.importar_alumnos(integer, jsonb) from public;
grant execute on function public.importar_alumnos(integer, jsonb) to authenticated;

create or replace function public.revocar_credencial(p_alumno uuid, p_motivo text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_administrador() then
    raise exception 'SIN_PERMISO' using errcode = '42501';
  end if;

  update public.credenciales
     set estado = 'revocada', revocada_en = now(), motivo_revocacion = p_motivo
   where alumno_id = p_alumno and estado = 'vigente';

  insert into public.credenciales (alumno_id, anio_escolar)
  select a.id, a.anio_escolar from public.alumnos a where a.id = p_alumno;
end;
$$;

grant execute on function public.revocar_credencial(uuid, text) to authenticated;

create or replace function public.dar_baja_ausentes(p_anio integer)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
begin
  if not public.es_administrador() then
    raise exception 'SIN_PERMISO' using errcode = '42501';
  end if;

  update public.credenciales c
     set estado = 'revocada', revocada_en = now(), motivo_revocacion = 'baja_anual'
   where c.estado = 'vigente'
     and exists (
       select 1 from public.alumnos a
        where a.id = c.alumno_id and a.estado = 'activo'
          and not exists (
            select 1 from public.matriculas m
             where m.alumno_id = a.id and m.anio_escolar = p_anio
          )
     );

  update public.alumnos a
     set estado = 'de_baja', updated_at = now()
   where a.estado = 'activo'
     and not exists (
       select 1 from public.matriculas m
        where m.alumno_id = a.id and m.anio_escolar = p_anio
     );

  get diagnostics v_total = row_count;
  return v_total;
end;
$$;

grant execute on function public.dar_baja_ausentes(integer) to authenticated;


-- ============================================================
-- supabase/migrations/20261117010300_foto_alumno.sql
-- Foto opcional para el carnet.
alter table public.alumnos add column if not exists foto_url text;

comment on column public.alumnos.foto_url is 'URL pública de la foto; sólo se usa en el carnet';


-- ============================================================
-- supabase/migrations/20261117010400_auditoria_padron.sql
-- Auditoría del padrón y de las credenciales.
drop trigger if exists trg_auditoria on public.alumnos;
create trigger trg_auditoria
  after insert or update or delete on public.alumnos
  for each row execute function public.registrar_auditoria();

drop trigger if exists trg_auditoria on public.credenciales;
create trigger trg_auditoria
  after insert or update or delete on public.credenciales
  for each row execute function public.registrar_auditoria();


notify pgrst, 'reload schema';
