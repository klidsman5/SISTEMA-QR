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
