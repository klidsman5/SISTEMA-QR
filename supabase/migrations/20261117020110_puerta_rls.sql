-- RLS de puerta: el Auxiliar ve y registra lo suyo; el Administrador todo; el Docente nada.
alter table public.asistencias_puerta enable row level security;
alter table public.cierres_jornada enable row level security;

drop policy if exists puerta_select on public.asistencias_puerta;
drop policy if exists puerta_insert on public.asistencias_puerta;
create policy puerta_select on public.asistencias_puerta
  for select to authenticated
  using (public.es_administrador() or registrado_por = public.usuario_id_actual());
create policy puerta_insert on public.asistencias_puerta
  for insert to authenticated
  with check (public.es_administrador() or registrado_por = public.usuario_id_actual());

drop policy if exists cierres_select on public.cierres_jornada;
drop policy if exists cierres_write on public.cierres_jornada;
create policy cierres_select on public.cierres_jornada
  for select to authenticated using (true);
create policy cierres_write on public.cierres_jornada
  for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());
