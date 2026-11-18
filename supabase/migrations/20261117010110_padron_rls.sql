-- RLS del padrón: lectura para el personal autenticado, escritura sólo Administrador.
-- Idempotente: se puede volver a ejecutar sin chocar con políticas existentes.
alter table public.alumnos enable row level security;
alter table public.matriculas enable row level security;
alter table public.credenciales enable row level security;
alter table public.importaciones enable row level security;

drop policy if exists alumnos_select on public.alumnos;
drop policy if exists alumnos_write on public.alumnos;
create policy alumnos_select on public.alumnos
  for select to authenticated using (true);
create policy alumnos_write on public.alumnos
  for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

drop policy if exists matriculas_select on public.matriculas;
drop policy if exists matriculas_write on public.matriculas;
create policy matriculas_select on public.matriculas
  for select to authenticated using (true);
create policy matriculas_write on public.matriculas
  for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

drop policy if exists credenciales_select on public.credenciales;
drop policy if exists credenciales_write on public.credenciales;
create policy credenciales_select on public.credenciales
  for select to authenticated using (true);
create policy credenciales_write on public.credenciales
  for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

drop policy if exists importaciones_select on public.importaciones;
drop policy if exists importaciones_write on public.importaciones;
create policy importaciones_select on public.importaciones
  for select to authenticated using (public.es_administrador());
create policy importaciones_write on public.importaciones
  for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

notify pgrst, 'reload schema';
