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
