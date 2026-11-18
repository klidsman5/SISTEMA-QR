-- RLS: Administrador todo; Docente sólo alumnos de sus cursos.
alter table public.justificaciones enable row level security;
alter table public.justificaciones_historial enable row level security;

create or replace function public.docente_atiende_alumno(p_alumno uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.alumnos a
    join public.cursos c on c.seccion_id = a.seccion_id and c.activo
    where a.id = p_alumno and c.docente_id = public.usuario_id_actual()
  );
$$;

grant execute on function public.docente_atiende_alumno(uuid) to authenticated;

drop policy if exists justificaciones_select on public.justificaciones;
drop policy if exists justificaciones_insert on public.justificaciones;
drop policy if exists justificaciones_update on public.justificaciones;

create policy justificaciones_select on public.justificaciones
  for select to authenticated
  using (public.es_administrador() or public.docente_atiende_alumno(alumno_id));

create policy justificaciones_insert on public.justificaciones
  for insert to authenticated
  with check (
    (public.es_administrador() or public.docente_atiende_alumno(alumno_id))
    and aprobado_por = public.usuario_id_actual()
  );

create policy justificaciones_update on public.justificaciones
  for update to authenticated
  using (public.es_administrador() or public.docente_atiende_alumno(alumno_id))
  with check (public.es_administrador() or public.docente_atiende_alumno(alumno_id));

drop policy if exists historial_select on public.justificaciones_historial;
drop policy if exists historial_insert on public.justificaciones_historial;
create policy historial_select on public.justificaciones_historial
  for select to authenticated
  using (
    public.es_administrador()
    or exists (
      select 1 from public.justificaciones j
      where j.id = justificaciones_historial.justificacion_id
        and public.docente_atiende_alumno(j.alumno_id)
    )
  );
create policy historial_insert on public.justificaciones_historial
  for insert to authenticated
  with check (public.es_administrador() or public.docente_atiende_alumno(
    (select alumno_id from public.justificaciones where id = justificacion_id)
  ));
