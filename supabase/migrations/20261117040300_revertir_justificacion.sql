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
