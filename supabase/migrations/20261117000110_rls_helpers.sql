-- Funciones de contexto y políticas RLS del módulo 002.
create or replace function public.rol_actual()
returns public.rol_usuario
language sql
stable
security definer
set search_path = public
as $$
  select rol from public.usuarios
  where auth_user_id = auth.uid() and activo
  limit 1;
$$;

create or replace function public.usuario_id_actual()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.usuarios
  where auth_user_id = auth.uid() and activo
  limit 1;
$$;

create or replace function public.es_administrador()
returns boolean
language sql
stable
as $$ select public.rol_actual() = 'administrador'; $$;

alter table public.usuarios enable row level security;
alter table public.turnos enable row level security;
alter table public.grados enable row level security;
alter table public.secciones enable row level security;
alter table public.cursos enable row level security;
alter table public.auditoria enable row level security;

-- usuarios: cada quien ve su fila; el Administrador ve y administra todas.
create policy usuarios_select on public.usuarios
  for select to authenticated
  using (id = public.usuario_id_actual() or public.es_administrador());

create policy usuarios_update on public.usuarios
  for update to authenticated
  using (public.es_administrador())
  with check (public.es_administrador());

create policy usuarios_insert on public.usuarios
  for insert to authenticated
  with check (public.es_administrador());

-- estructura: lectura para todo el personal autenticado; escritura sólo Administrador.
create policy turnos_select on public.turnos
  for select to authenticated using (true);
create policy turnos_write on public.turnos
  for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

create policy grados_select on public.grados
  for select to authenticated using (true);
create policy grados_write on public.grados
  for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

create policy secciones_select on public.secciones
  for select to authenticated using (true);
create policy secciones_write on public.secciones
  for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

create policy cursos_select on public.cursos
  for select to authenticated
  using (public.es_administrador() or docente_id = public.usuario_id_actual());
create policy cursos_write on public.cursos
  for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

-- auditoría: lectura del Administrador; escritura sólo por funciones security definer.
create policy auditoria_select on public.auditoria
  for select to authenticated using (public.es_administrador());
