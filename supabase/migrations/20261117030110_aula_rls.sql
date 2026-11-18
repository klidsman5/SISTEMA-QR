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
