-- Modulo 004: asistencia de puerta. Seguro de reejecutar.
-- ============================================================
-- supabase/migrations/20261117020100_puerta_schema.sql
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


-- ============================================================
-- supabase/migrations/20261117020110_puerta_rls.sql
-- RLS de puerta: el Auxiliar ve y registra lo suyo; el Administrador todo; el Docente nada.
alter table public.asistencias_puerta enable row level security;
alter table public.cierres_jornada enable row level security;

drop policy if exists puerta_select on public.asistencias_puerta;
drop policy if exists puerta_insert on public.asistencias_puerta;
create policy puerta_select on public.asistencias_puerta
  for select to authenticated
  using (public.es_administrador() or registrado_por = public.usuario_id_actual());
create policy puerta_insert on public.asistencias_puerta
  for insert to authenticated
  with check (public.es_administrador() or registrado_por = public.usuario_id_actual());

drop policy if exists cierres_select on public.cierres_jornada;
drop policy if exists cierres_write on public.cierres_jornada;
create policy cierres_select on public.cierres_jornada
  for select to authenticated using (true);
create policy cierres_write on public.cierres_jornada
  for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());


-- ============================================================
-- supabase/migrations/20261117020200_registrar_puerta.sql
-- Registro idempotente de entrada con debounce y reconciliación.
create or replace function public.registrar_asistencia_puerta(p_evento jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol public.rol_usuario;
  v_evento_id uuid;
  v_hora timestamptz;
  v_fecha date;
  v_qr uuid;
  v_alumno_id uuid;
  v_grado_id uuid;
  v_seccion_id uuid;
  v_alumno_estado text;
  v_cred_estado text;
  v_entrada time;
  v_tolerancia integer;
  v_estado text;
  v_prev public.asistencias_puerta;
  v_debounce integer;
  v_origen text;
  v_motivo text;
begin
  v_rol := public.rol_actual();
  if v_rol is null or v_rol not in ('administrador', 'auxiliar_puerta') then
    raise exception 'SIN_PERMISO' using errcode = '42501';
  end if;

  v_evento_id := coalesce((p_evento ->> 'evento_id')::uuid, gen_random_uuid());
  v_hora := coalesce((p_evento ->> 'hora_dispositivo')::timestamptz, now());
  v_fecha := (v_hora at time zone 'America/Lima')::date;
  v_origen := coalesce(p_evento ->> 'origen', 'escaneo');
  v_motivo := nullif(p_evento ->> 'motivo', '');

  if exists (select 1 from public.asistencias_puerta where evento_id = v_evento_id) then
    return jsonb_build_object('resultado', 'duplicado', 'motivo', 'evento_repetido');
  end if;

  v_qr := (p_evento ->> 'qr_uuid')::uuid;

  select a.id, a.grado_id, a.seccion_id, a.estado, c.estado
    into v_alumno_id, v_grado_id, v_seccion_id, v_alumno_estado, v_cred_estado
  from public.credenciales c
  join public.alumnos a on a.id = c.alumno_id
  where c.qr_uuid = v_qr;

  if v_alumno_id is null then
    return jsonb_build_object('resultado', 'invalido', 'motivo', 'credencial_desconocida');
  end if;
  if v_cred_estado <> 'vigente' then
    return jsonb_build_object('resultado', 'invalido', 'motivo', 'credencial_revocada');
  end if;
  if v_alumno_estado <> 'activo' then
    return jsonb_build_object('resultado', 'invalido', 'motivo', 'alumno_de_baja');
  end if;

  select hora_entrada, tolerancia_min into v_entrada, v_tolerancia
  from public.grados where id = v_grado_id;

  v_estado := case
    when (v_hora at time zone 'America/Lima')::time <= (v_entrada + make_interval(mins => v_tolerancia))
      then 'puntual'
    else 'tardanza'
  end;

  select coalesce((valor)::text::integer, 5) into v_debounce
  from public.configuracion where clave = 'debounce_puerta_min';
  v_debounce := coalesce(v_debounce, 5);

  select * into v_prev
  from public.asistencias_puerta
  where alumno_id = v_alumno_id and fecha = v_fecha
  limit 1;

  if v_prev.id is not null then
    if v_prev.hora_dispositivo > v_hora - make_interval(mins => v_debounce) then
      return jsonb_build_object('resultado', 'duplicado', 'motivo', 'debounce',
                                'estado', v_prev.estado);
    end if;

    if v_prev.origen in ('cierre', 'permiso') then
      update public.asistencias_puerta
         set evento_id = v_evento_id,
             hora_dispositivo = v_hora,
             recibido_en = now(),
             estado = v_estado,
             hora_entrada_aplicada = v_entrada,
             tolerancia_aplicada = v_tolerancia,
             origen = v_origen,
             motivo_manual = v_motivo,
             dispositivo_id = p_evento ->> 'dispositivo_id',
             registrado_por = public.usuario_id_actual(),
             actualizada_en = now()
       where id = v_prev.id;

      return jsonb_build_object('resultado', 'reconciliado', 'estado', v_estado,
                                'estado_anterior', v_prev.estado);
    end if;

    return jsonb_build_object('resultado', 'duplicado', 'motivo', 'entrada_del_dia',
                              'estado', v_prev.estado);
  end if;

  insert into public.asistencias_puerta (
    evento_id, alumno_id, matricula_id, fecha, hora_dispositivo, estado,
    hora_entrada_aplicada, tolerancia_aplicada, origen, motivo_manual,
    dispositivo_id, registrado_por, requiere_revision
  )
  select v_evento_id, v_alumno_id, m.id, v_fecha, v_hora, v_estado,
         v_entrada, v_tolerancia, v_origen, v_motivo,
         p_evento ->> 'dispositivo_id', public.usuario_id_actual(),
         abs(extract(epoch from (now() - v_hora))) > 300
  from public.matriculas m
  where m.alumno_id = v_alumno_id
    and m.anio_escolar = (select anio_escolar from public.alumnos where id = v_alumno_id)
  limit 1;

  return jsonb_build_object('resultado', 'aplicado', 'estado', v_estado,
                            'alumno_id', v_alumno_id);
end;
$$;

grant execute on function public.registrar_asistencia_puerta(jsonb) to authenticated;


-- ============================================================
-- supabase/migrations/20261117020300_cierre_jornada.sql
-- Cierre de jornada idempotente por turno y fecha.
create or replace function public.uuid_determinista(p_texto text)
returns uuid
language sql
immutable
as $$
  select (
    substr(h, 1, 8) || '-' || substr(h, 9, 4) || '-' || substr(h, 13, 4) || '-' ||
    substr(h, 17, 4) || '-' || substr(h, 21, 12)
  )::uuid
  from (select encode(digest(p_texto, 'sha256'), 'hex') as h) s;
$$;

create or replace function public.cerrar_jornada(p_turno uuid, p_fecha date default current_date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer := 0;
  v_exceptuados integer := 0;
  v_ya_existe boolean;
  v_alumno record;
begin
  if not public.es_administrador() then
    raise exception 'SIN_PERMISO' using errcode = '42501';
  end if;

  select exists(
    select 1 from public.cierres_jornada where turno_id = p_turno and fecha = p_fecha
  ) into v_ya_existe;

  if v_ya_existe then
    return jsonb_build_object('resultado', 'ya_cerrado');
  end if;

  for v_alumno in
    select a.id, a.grado_id, g.hora_entrada, g.tolerancia_min
    from public.alumnos a
    join public.grados g on g.id = a.grado_id
    where a.estado = 'activo' and g.turno_id = p_turno
      and not exists (
        select 1 from public.asistencias_puerta p
        where p.alumno_id = a.id and p.fecha = p_fecha
      )
  loop
    if to_regclass('public.justificaciones') is not null
       and exists (
         select 1 from public.justificaciones j
         where j.alumno_id = v_alumno.id and j.fecha = p_fecha and j.estado = 'vigente'
       ) then
      insert into public.asistencias_puerta (
        evento_id, alumno_id, fecha, hora_dispositivo, estado,
        hora_entrada_aplicada, tolerancia_aplicada, origen
      ) values (
        public.uuid_determinista('permiso:' || v_alumno.id || ':' || p_fecha),
        v_alumno.id, p_fecha, p_fecha::timestamptz, 'justificado',
        v_alumno.hora_entrada, v_alumno.tolerancia_min, 'permiso'
      ) on conflict (alumno_id, fecha) do nothing;
      v_exceptuados := v_exceptuados + 1;
    else
      insert into public.asistencias_puerta (
        evento_id, alumno_id, fecha, hora_dispositivo, estado,
        hora_entrada_aplicada, tolerancia_aplicada, origen
      ) values (
        public.uuid_determinista('cierre:' || v_alumno.id || ':' || p_fecha),
        v_alumno.id, p_fecha, p_fecha::timestamptz, 'falta',
        v_alumno.hora_entrada, v_alumno.tolerancia_min, 'cierre'
      ) on conflict (alumno_id, fecha) do nothing;
      v_total := v_total + 1;
    end if;
  end loop;

  insert into public.cierres_jornada (turno_id, fecha, ejecutado_por, total_faltas, total_exceptuados)
  values (p_turno, p_fecha, public.usuario_id_actual(), v_total, v_exceptuados)
  on conflict (turno_id, fecha) do nothing;

  return jsonb_build_object('resultado', 'cerrado', 'faltas', v_total, 'exceptuados', v_exceptuados);
end;
$$;

grant execute on function public.cerrar_jornada(uuid, date) to authenticated;


-- ============================================================
-- supabase/migrations/20261117020400_reconciliacion_puerta.sql
-- La reconciliación vive en registrar_asistencia_puerta (20261117020200).
-- Este archivo deja constancia del contrato y añade el índice de búsqueda por evento.
create index if not exists puerta_evento_idx on public.asistencias_puerta (evento_id);

comment on function public.registrar_asistencia_puerta(jsonb) is
  'Única autoridad de puerta: idempotencia por evento_id, debounce y reconciliación de permiso/cierre.';


notify pgrst, 'reload schema';
