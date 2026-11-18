-- Modulo 006: justificaciones. Seguro de reejecutar.
-- ============================================================
-- supabase/migrations/20261117040100_justificaciones_schema.sql
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


-- ============================================================
-- supabase/migrations/20261117040110_justificaciones_rls.sql
-- RLS: Administrador todo; Docente sólo alumnos de sus cursos.
alter table public.justificaciones enable row level security;
alter table public.justificaciones_historial enable row level security;

create or replace function public.docente_atiende_alumno(p_alumno uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.alumnos a
    join public.cursos c on c.seccion_id = a.seccion_id and c.activo
    where a.id = p_alumno and c.docente_id = public.usuario_id_actual()
  );
$$;

grant execute on function public.docente_atiende_alumno(uuid) to authenticated;

drop policy if exists justificaciones_select on public.justificaciones;
drop policy if exists justificaciones_insert on public.justificaciones;
drop policy if exists justificaciones_update on public.justificaciones;

create policy justificaciones_select on public.justificaciones
  for select to authenticated
  using (public.es_administrador() or public.docente_atiende_alumno(alumno_id));

create policy justificaciones_insert on public.justificaciones
  for insert to authenticated
  with check (
    (public.es_administrador() or public.docente_atiende_alumno(alumno_id))
    and aprobado_por = public.usuario_id_actual()
  );

create policy justificaciones_update on public.justificaciones
  for update to authenticated
  using (public.es_administrador() or public.docente_atiende_alumno(alumno_id))
  with check (public.es_administrador() or public.docente_atiende_alumno(alumno_id));

drop policy if exists historial_select on public.justificaciones_historial;
drop policy if exists historial_insert on public.justificaciones_historial;
create policy historial_select on public.justificaciones_historial
  for select to authenticated
  using (
    public.es_administrador()
    or exists (
      select 1 from public.justificaciones j
      where j.id = justificaciones_historial.justificacion_id
        and public.docente_atiende_alumno(j.alumno_id)
    )
  );
create policy historial_insert on public.justificaciones_historial
  for insert to authenticated
  with check (public.es_administrador() or public.docente_atiende_alumno(
    (select alumno_id from public.justificaciones where id = justificacion_id)
  ));


-- ============================================================
-- supabase/migrations/20261117040200_aplicar_justificacion.sql
-- Aplicar una justificación a los registros del día.
create or replace function public.aplicar_justificacion(p_justificacion uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_j public.justificaciones;
  v_puerta integer := 0;
  v_aula integer := 0;
begin
  select * into v_j from public.justificaciones where id = p_justificacion;
  if v_j.id is null then
    raise exception 'JUSTIFICACION_INEXISTENTE' using errcode = '22023';
  end if;

  if not public.es_administrador() and not public.docente_atiende_alumno(v_j.alumno_id) then
    raise exception 'SIN_PERMISO' using errcode = '42501';
  end if;

  if v_j.nivel in ('puerta', 'ambos') then
    update public.asistencias_puerta
       set estado = 'justificado'
     where alumno_id = v_j.alumno_id
       and fecha = v_j.fecha
       and estado in ('falta', 'tardanza');
    get diagnostics v_puerta = row_count;
  end if;

  if v_j.nivel in ('aula', 'ambos') then
    update public.asistencias_curso
       set estado = 'justificado'
     where alumno_id = v_j.alumno_id
       and fecha = v_j.fecha
       and estado in ('falta', 'tardanza');
    get diagnostics v_aula = row_count;
  end if;

  insert into public.justificaciones_historial (justificacion_id, usuario_id, accion, valor_anterior, valor_nuevo)
  values (p_justificacion, public.usuario_id_actual(), 'aplicar',
          null, jsonb_build_object('puerta', v_puerta, 'aula', v_aula));

  return jsonb_build_object('puerta', v_puerta, 'aula', v_aula);
end;
$$;

grant execute on function public.aplicar_justificacion(uuid) to authenticated;


-- ============================================================
-- supabase/migrations/20261117040300_revertir_justificacion.sql
-- Revertir conservando historial. Sólo restaura faltas generadas por cierre o permiso.
create or replace function public.revertir_justificacion(p_justificacion uuid, p_motivo text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_j public.justificaciones;
  v_puerta integer := 0;
  v_aula integer := 0;
begin
  select * into v_j from public.justificaciones where id = p_justificacion;
  if v_j.id is null then
    raise exception 'JUSTIFICACION_INEXISTENTE' using errcode = '22023';
  end if;
  if v_j.estado <> 'vigente' then
    raise exception 'JUSTIFICACION_YA_REVERTIDA' using errcode = '22023';
  end if;
  if not public.es_administrador()
     and v_j.aprobado_por <> public.usuario_id_actual()
     and not public.docente_atiende_alumno(v_j.alumno_id) then
    raise exception 'SIN_PERMISO' using errcode = '42501';
  end if;
  if length(coalesce(trim(p_motivo), '')) < 3 then
    raise exception 'MOTIVO_REQUERIDO' using errcode = '22023';
  end if;

  update public.asistencias_puerta
     set estado = 'falta'
   where alumno_id = v_j.alumno_id and fecha = v_j.fecha
     and estado = 'justificado' and origen in ('cierre', 'permiso');
  get diagnostics v_puerta = row_count;

  update public.asistencias_curso
     set estado = 'falta'
   where alumno_id = v_j.alumno_id and fecha = v_j.fecha
     and estado = 'justificado' and origen in ('cierre', 'permiso');
  get diagnostics v_aula = row_count;

  update public.justificaciones set estado = 'revertida' where id = v_j.id;

  insert into public.justificaciones_historial (justificacion_id, usuario_id, accion, valor_anterior, valor_nuevo)
  values (p_justificacion, public.usuario_id_actual(), 'revertir',
          jsonb_build_object('estado', 'vigente'), jsonb_build_object('estado', 'revertida', 'motivo', p_motivo));

  return jsonb_build_object('puerta', v_puerta, 'aula', v_aula);
end;
$$;

grant execute on function public.revertir_justificacion(uuid, text) to authenticated;


notify pgrst, 'reload schema';
