-- Modulo 005: asistencia de aula. Seguro de reejecutar.
-- ============================================================
-- supabase/migrations/20261117030100_aula_schema.sql
-- Módulo 005: sesiones de clase y asistencia de aula.
create table if not exists public.sesiones_clase (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.cursos (id),
  docente_id uuid not null references public.usuarios (id),
  fecha date not null,
  abierta_en timestamptz not null default now(),
  cerrada_en timestamptz,
  estado text not null default 'abierta' check (estado in ('abierta', 'cerrada')),
  hora_inicio_aplicada time not null,
  tolerancia_aplicada integer not null,
  created_at timestamptz not null default now()
);

create unique index if not exists sesion_abierta_por_curso
  on public.sesiones_clase (curso_id, fecha)
  where estado = 'abierta';

create index if not exists sesiones_docente_fecha_idx on public.sesiones_clase (docente_id, fecha desc);

create table if not exists public.asistencias_curso (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null unique,
  sesion_id uuid not null references public.sesiones_clase (id) on delete cascade,
  alumno_id uuid not null references public.alumnos (id) on delete cascade,
  matricula_id uuid references public.matriculas (id),
  fecha date not null,
  hora_dispositivo timestamptz not null,
  recibido_en timestamptz not null default now(),
  estado text not null check (estado in ('puntual', 'tardanza', 'falta', 'justificado')),
  origen text not null default 'escaneo' check (origen in ('escaneo', 'manual', 'cierre', 'permiso')),
  dispositivo_id text,
  registrado_por uuid references public.usuarios (id),
  actualizada_en timestamptz,
  created_at timestamptz not null default now(),
  unique (sesion_id, alumno_id)
);

create index if not exists asistencias_curso_fecha_idx on public.asistencias_curso (fecha);
create index if not exists asistencias_curso_alumno_idx on public.asistencias_curso (alumno_id, fecha);

insert into public.configuracion (clave, valor, descripcion)
values ('debounce_aula_min', '5'::jsonb, 'Ventana de enfriamiento por curso en minutos')
on conflict (clave) do nothing;


-- ============================================================
-- supabase/migrations/20261117030110_aula_rls.sql
-- RLS de aula: el Docente sólo sus cursos; el Administrador todo.
alter table public.sesiones_clase enable row level security;
alter table public.asistencias_curso enable row level security;

drop policy if exists sesiones_select on public.sesiones_clase;
drop policy if exists sesiones_insert on public.sesiones_clase;
drop policy if exists sesiones_update on public.sesiones_clase;

create policy sesiones_select on public.sesiones_clase
  for select to authenticated
  using (public.es_administrador() or docente_id = public.usuario_id_actual());
create policy sesiones_insert on public.sesiones_clase
  for insert to authenticated
  with check (public.es_administrador() or docente_id = public.usuario_id_actual());
create policy sesiones_update on public.sesiones_clase
  for update to authenticated
  using (public.es_administrador() or docente_id = public.usuario_id_actual())
  with check (public.es_administrador() or docente_id = public.usuario_id_actual());

drop policy if exists asistencias_curso_select on public.asistencias_curso;
drop policy if exists asistencias_curso_insert on public.asistencias_curso;

create policy asistencias_curso_select on public.asistencias_curso
  for select to authenticated
  using (
    public.es_administrador()
    or exists (
      select 1 from public.sesiones_clase s
      where s.id = asistencias_curso.sesion_id
        and s.docente_id = public.usuario_id_actual()
    )
  );

create policy asistencias_curso_insert on public.asistencias_curso
  for insert to authenticated
  with check (
    public.es_administrador()
    or exists (
      select 1 from public.sesiones_clase s
      where s.id = asistencias_curso.sesion_id
        and s.docente_id = public.usuario_id_actual()
        and s.estado = 'abierta'
    )
  );


-- ============================================================
-- supabase/migrations/20261117030200_registrar_aula.sql
-- Registro de asistencia de aula: única autoridad del nivel 2.
create or replace function public.registrar_asistencia_curso(p_evento jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rol public.rol_usuario;
  v_evento_id uuid;
  v_hora timestamptz;
  v_sesion public.sesiones_clase;
  v_curso public.cursos;
  v_qr uuid;
  v_alumno_id uuid;
  v_alumno_seccion uuid;
  v_alumno_estado text;
  v_cred_estado text;
  v_estado text;
  v_prev public.asistencias_curso;
  v_debounce integer;
begin
  v_rol := public.rol_actual();
  if v_rol is null or v_rol not in ('administrador', 'docente') then
    raise exception 'SIN_PERMISO' using errcode = '42501';
  end if;

  v_evento_id := coalesce((p_evento ->> 'evento_id')::uuid, gen_random_uuid());
  v_hora := coalesce((p_evento ->> 'hora_dispositivo')::timestamptz, now());

  select * into v_sesion from public.sesiones_clase where id = (p_evento ->> 'sesion_id')::uuid;
  if v_sesion.id is null then
    return jsonb_build_object('resultado', 'invalido', 'motivo', 'sesion_inexistente');
  end if;
  if v_sesion.estado <> 'abierta' then
    return jsonb_build_object('resultado', 'invalido', 'motivo', 'sesion_cerrada');
  end if;
  if v_rol = 'docente' and v_sesion.docente_id <> public.usuario_id_actual() then
    raise exception 'SIN_PERMISO' using errcode = '42501';
  end if;

  select * into v_curso from public.cursos where id = v_sesion.curso_id;

  if exists (select 1 from public.asistencias_curso where evento_id = v_evento_id) then
    return jsonb_build_object('resultado', 'duplicado', 'motivo', 'evento_repetido');
  end if;

  v_qr := (p_evento ->> 'qr_uuid')::uuid;

  select a.id, a.seccion_id, a.estado, c.estado
    into v_alumno_id, v_alumno_seccion, v_alumno_estado, v_cred_estado
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
  if v_alumno_seccion <> v_curso.seccion_id then
    return jsonb_build_object('resultado', 'invalido', 'motivo', 'fuera_de_seccion');
  end if;

  v_estado := case
    when (v_hora at time zone 'America/Lima')::time
         <= (v_sesion.hora_inicio_aplicada + make_interval(mins => v_sesion.tolerancia_aplicada))
      then 'puntual'
    else 'tardanza'
  end;

  select coalesce((valor)::text::integer, 5) into v_debounce
  from public.configuracion where clave = 'debounce_aula_min';
  v_debounce := coalesce(v_debounce, 5);

  select * into v_prev
  from public.asistencias_curso
  where sesion_id = v_sesion.id and alumno_id = v_alumno_id
  limit 1;

  if v_prev.id is not null then
    if v_prev.estado = 'falta' then
      update public.asistencias_curso
         set evento_id = v_evento_id,
             hora_dispositivo = v_hora,
             recibido_en = now(),
             estado = v_estado,
             origen = 'escaneo',
             dispositivo_id = p_evento ->> 'dispositivo_id',
             registrado_por = public.usuario_id_actual(),
             actualizada_en = now()
       where id = v_prev.id;

      return jsonb_build_object('resultado', 'reconciliado', 'estado', v_estado);
    end if;

    if v_prev.hora_dispositivo > v_hora - make_interval(mins => v_debounce) then
      return jsonb_build_object('resultado', 'duplicado', 'motivo', 'debounce', 'estado', v_prev.estado);
    end if;

    return jsonb_build_object('resultado', 'duplicado', 'motivo', 'asistencia_previa', 'estado', v_prev.estado);
  end if;

  insert into public.asistencias_curso (
    evento_id, sesion_id, alumno_id, matricula_id, fecha, hora_dispositivo,
    estado, origen, dispositivo_id, registrado_por
  )
  select v_evento_id, v_sesion.id, v_alumno_id, m.id, v_sesion.fecha, v_hora,
         v_estado, 'escaneo', p_evento ->> 'dispositivo_id', public.usuario_id_actual()
  from public.matriculas m
  where m.alumno_id = v_alumno_id and m.anio_escolar = extract(year from v_sesion.fecha)::int
  limit 1;

  return jsonb_build_object('resultado', 'aplicado', 'estado', v_estado, 'alumno_id', v_alumno_id);
end;
$$;

grant execute on function public.registrar_asistencia_curso(jsonb) to authenticated;


-- ============================================================
-- supabase/migrations/20261117030300_cerrar_sesion.sql
-- Cierre de sesión: marca faltas y es idempotente.
create or replace function public.cerrar_sesion(p_sesion uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sesion public.sesiones_clase;
  v_curso public.cursos;
  v_alumno record;
  v_faltas integer := 0;
  v_justificados integer := 0;
begin
  select * into v_sesion from public.sesiones_clase where id = p_sesion;
  if v_sesion.id is null then
    return jsonb_build_object('resultado', 'invalido', 'motivo', 'sesion_inexistente');
  end if;
  if public.rol_actual() <> 'administrador' and v_sesion.docente_id <> public.usuario_id_actual() then
    raise exception 'SIN_PERMISO' using errcode = '42501';
  end if;
  if v_sesion.estado = 'cerrada' then
    return jsonb_build_object('resultado', 'ya_cerrada');
  end if;

  select * into v_curso from public.cursos where id = v_sesion.curso_id;

  for v_alumno in
    select a.id
    from public.alumnos a
    where a.estado = 'activo' and a.seccion_id = v_curso.seccion_id
      and not exists (
        select 1 from public.asistencias_curso c
        where c.sesion_id = v_sesion.id and c.alumno_id = a.id
      )
  loop
    if to_regclass('public.justificaciones') is not null
       and exists (
         select 1 from public.justificaciones j
         where j.alumno_id = v_alumno.id and j.fecha = v_sesion.fecha and j.estado = 'vigente'
       ) then
      insert into public.asistencias_curso (
        evento_id, sesion_id, alumno_id, fecha, hora_dispositivo, estado,
        origen, registrado_por
      ) values (
        public.uuid_determinista('aula-permiso:' || v_sesion.id || ':' || v_alumno.id),
        v_sesion.id, v_alumno.id, v_sesion.fecha, now(), 'justificado',
        'permiso', v_sesion.docente_id
      ) on conflict (sesion_id, alumno_id) do nothing;
      v_justificados := v_justificados + 1;
    else
      insert into public.asistencias_curso (
        evento_id, sesion_id, alumno_id, fecha, hora_dispositivo, estado,
        origen, registrado_por
      ) values (
        public.uuid_determinista('aula-cierre:' || v_sesion.id || ':' || v_alumno.id),
        v_sesion.id, v_alumno.id, v_sesion.fecha, now(), 'falta',
        'cierre', v_sesion.docente_id
      ) on conflict (sesion_id, alumno_id) do nothing;
      v_faltas := v_faltas + 1;
    end if;
  end loop;

  update public.sesiones_clase
     set estado = 'cerrada', cerrada_en = now()
   where id = v_sesion.id;

  return jsonb_build_object('resultado', 'cerrada', 'faltas', v_faltas, 'justificados', v_justificados);
end;
$$;

grant execute on function public.cerrar_sesion(uuid) to authenticated;


-- ============================================================
-- supabase/migrations/20261117030400_reconciliacion_aula.sql
-- La reconciliación de faltas vive en registrar_asistencia_curso (20261117030200).
create index if not exists asistencias_curso_evento_idx on public.asistencias_curso (evento_id);

comment on function public.registrar_asistencia_curso(jsonb) is
  'Única autoridad de aula: idempotencia, debounce por curso y reconciliación de faltas del cierre.';

-- Auditoría de sesiones y asistencias de aula.
drop trigger if exists trg_auditoria on public.sesiones_clase;
create trigger trg_auditoria
  after insert or update or delete on public.sesiones_clase
  for each row execute function public.registrar_auditoria();


notify pgrst, 'reload schema';
