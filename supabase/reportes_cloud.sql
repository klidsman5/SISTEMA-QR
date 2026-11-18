-- Modulo 007: vistas y auditoria de reportes. Seguro de reejecutar.
-- supabase/migrations/20261117050100_vistas_reportes.sql
-- Módulo 007: vistas de reportes. security_invoker respeta el RLS de las tablas base.
create or replace view public.v_asistencia_detalle
with (security_invoker = on) as
select
  'puerta'::text as nivel,
  p.id,
  p.alumno_id,
  p.fecha,
  p.hora_dispositivo as hora,
  p.estado,
  p.origen,
  a.nombres,
  a.apellidos,
  a.dni,
  coalesce(m.grado_id, a.grado_id) as grado_id,
  coalesce(m.seccion_id, a.seccion_id) as seccion_id,
  null::uuid as curso_id,
  null::text as curso,
  null::uuid as docente_id,
  null::uuid as sesion_id
from public.asistencias_puerta p
join public.alumnos a on a.id = p.alumno_id
left join public.matriculas m on m.id = p.matricula_id

union all

select
  'aula'::text,
  c.id,
  c.alumno_id,
  c.fecha,
  c.hora_dispositivo,
  c.estado,
  c.origen,
  a.nombres,
  a.apellidos,
  a.dni,
  coalesce(m.grado_id, a.grado_id),
  coalesce(m.seccion_id, a.seccion_id),
  cu.id,
  cu.nombre,
  cu.docente_id,
  s.id
from public.asistencias_curso c
join public.alumnos a on a.id = c.alumno_id
left join public.matriculas m on m.id = c.matricula_id
join public.sesiones_clase s on s.id = c.sesion_id
join public.cursos cu on cu.id = s.curso_id;

create or replace view public.v_asistencia_diaria
with (security_invoker = on) as
select
  d.alumno_id,
  d.fecha,
  d.nivel,
  count(*) as registros,
  bool_or(d.estado in ('puntual', 'tardanza')) as tiene_entrada,
  bool_or(d.estado = 'justificado') as justificado,
  bool_or(d.estado = 'falta') as falta
from public.v_asistencia_detalle d
group by d.alumno_id, d.fecha, d.nivel;

create or replace view public.v_metricas_mensuales
with (security_invoker = on) as
select
  date_trunc('month', d.fecha)::date as mes,
  d.grado_id,
  d.seccion_id,
  count(*) as total,
  count(*) filter (where d.estado = 'puntual') as puntuales,
  count(*) filter (where d.estado = 'tardanza') as tardanzas,
  count(*) filter (where d.estado = 'falta') as faltas,
  count(*) filter (where d.estado = 'justificado') as justificados
from public.v_asistencia_detalle d
group by 1, 2, 3;

create table if not exists public.reportes_generados (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid references public.usuarios (id),
  fecha timestamptz not null default now(),
  rango_desde date,
  rango_hasta date,
  filtros jsonb not null default '{}'::jsonb,
  formato text not null check (formato in ('xlsx', 'pdf')),
  filas integer not null default 0,
  estado text not null default 'ok' check (estado in ('ok', 'error'))
);

alter table public.reportes_generados enable row level security;

drop policy if exists reportes_select on public.reportes_generados;
drop policy if exists reportes_insert on public.reportes_generados;
create policy reportes_select on public.reportes_generados
  for select to authenticated
  using (public.es_administrador() or usuario_id = public.usuario_id_actual());
create policy reportes_insert on public.reportes_generados
  for insert to authenticated
  with check (public.es_administrador() or usuario_id = public.usuario_id_actual());


notify pgrst, 'reload schema';
