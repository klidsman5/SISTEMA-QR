-- El bloque de un curso debe empezar y terminar dentro del mismo día.
alter table public.cursos
  drop constraint if exists cursos_bloque_en_dia;

alter table public.cursos
  add constraint cursos_bloque_en_dia
  check (
    duracion_bloque_min between 20 and 180
    and (hora_inicio + make_interval(mins => duracion_bloque_min))::time > hora_inicio
  );
