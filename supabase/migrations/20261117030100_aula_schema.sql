-- Módulo 005: sesiones de clase y asistencia de aula.
create table if not exists public.sesiones_clase (
  id uuid primary key default gen_random_uuid(),
  curso_id uuid not null references public.cursos (id),
  docente_id uuid not null references public.usuarios (id),
  fecha date not null,
  abierta_en timestamptz not null default now(),
  cerrada_en timestamptz,
  estado text not null default 'abierta' check (estado in ('abierta', 'cerrada')),
  hora_inicio_aplicada time not null,
  tolerancia_aplicada integer not null,
  created_at timestamptz not null default now()
);

create unique index if not exists sesion_abierta_por_curso
  on public.sesiones_clase (curso_id, fecha)
  where estado = 'abierta';

create index if not exists sesiones_docente_fecha_idx on public.sesiones_clase (docente_id, fecha desc);

create table if not exists public.asistencias_curso (
  id uuid primary key default gen_random_uuid(),
  evento_id uuid not null unique,
  sesion_id uuid not null references public.sesiones_clase (id) on delete cascade,
  alumno_id uuid not null references public.alumnos (id) on delete cascade,
  matricula_id uuid references public.matriculas (id),
  fecha date not null,
  hora_dispositivo timestamptz not null,
  recibido_en timestamptz not null default now(),
  estado text not null check (estado in ('puntual', 'tardanza', 'falta', 'justificado')),
  origen text not null default 'escaneo' check (origen in ('escaneo', 'manual', 'cierre', 'permiso')),
  dispositivo_id text,
  registrado_por uuid references public.usuarios (id),
  actualizada_en timestamptz,
  created_at timestamptz not null default now(),
  unique (sesion_id, alumno_id)
);

create index if not exists asistencias_curso_fecha_idx on public.asistencias_curso (fecha);
create index if not exists asistencias_curso_alumno_idx on public.asistencias_curso (alumno_id, fecha);

insert into public.configuracion (clave, valor, descripcion)
values ('debounce_aula_min', '5'::jsonb, 'Ventana de enfriamiento por curso en minutos')
on conflict (clave) do nothing;
