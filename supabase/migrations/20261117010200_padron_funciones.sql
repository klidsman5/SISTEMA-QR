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
