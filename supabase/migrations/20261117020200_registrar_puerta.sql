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
