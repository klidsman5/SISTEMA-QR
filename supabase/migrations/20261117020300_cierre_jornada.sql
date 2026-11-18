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
