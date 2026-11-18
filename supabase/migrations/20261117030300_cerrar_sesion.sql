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
