-- Cursos de un mismo docente cuyos bloques se solapan.
create or replace function public.cursos_solapados(p_docente uuid)
returns table (
  curso_a uuid,
  curso_b uuid,
  inicio_a time,
  fin_a time,
  inicio_b time,
  fin_b time
)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, b.id,
         a.hora_inicio,
         (a.hora_inicio + make_interval(mins => a.duracion_bloque_min))::time,
         b.hora_inicio,
         (b.hora_inicio + make_interval(mins => b.duracion_bloque_min))::time
  from public.cursos a
  join public.cursos b
    on a.docente_id = b.docente_id
   and a.id < b.id
   and a.activo and b.activo
  where a.docente_id = p_docente
    and a.hora_inicio < (b.hora_inicio + make_interval(mins => b.duracion_bloque_min))::time
    and b.hora_inicio < (a.hora_inicio + make_interval(mins => a.duracion_bloque_min))::time;
$$;

grant execute on function public.cursos_solapados(uuid) to authenticated;
