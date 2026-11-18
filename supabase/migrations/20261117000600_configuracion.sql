-- Parámetros operativos editables por el Administrador.
create table if not exists public.configuracion (
  clave text primary key,
  valor jsonb not null,
  descripcion text,
  updated_at timestamptz not null default now()
);

insert into public.configuracion (clave, valor, descripcion) values
  ('debounce_puerta_min', '5'::jsonb, 'Ventana de enfriamiento de puerta en minutos'),
  ('desfase_reloj_min', '5'::jsonb, 'Desfase de reloj tolerado en minutos'),
  ('duracion_bloque_min', '45'::jsonb, 'Duración de bloque por defecto en minutos'),
  ('retencion_dias', '365'::jsonb, 'Días de retención del historial')
on conflict (clave) do nothing;

alter table public.configuracion enable row level security;

create policy configuracion_select on public.configuracion
  for select to authenticated using (true);

create policy configuracion_write on public.configuracion
  for all to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

drop trigger if exists trg_auditoria on public.configuracion;
create trigger trg_auditoria
  after insert or update or delete on public.configuracion
  for each row execute function public.registrar_auditoria();
