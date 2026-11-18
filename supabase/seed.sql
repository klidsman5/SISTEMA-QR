-- Datos mínimos de desarrollo.
insert into public.turnos (nombre, hora_cierre) values
  ('mañana', '12:30'),
  ('tarde', '18:00')
on conflict (nombre) do nothing;

insert into public.grados (nombre, turno_id, hora_entrada, tolerancia_min)
select '3ro', t.id, '07:30', 10
from public.turnos t
where t.nombre = 'mañana'
on conflict (nombre) do nothing;

insert into public.secciones (grado_id, nombre)
select g.id, s.nombre
from public.grados g
cross join (values ('A'), ('B')) as s(nombre)
where g.nombre = '3ro'
on conflict (grado_id, nombre) do nothing;

insert into public.configuracion (clave, valor, descripcion) values
  ('debounce_puerta_min', '5'::jsonb, 'Ventana de enfriamiento de puerta en minutos'),
  ('desfase_reloj_min', '5'::jsonb, 'Desfase de reloj tolerado en minutos'),
  ('duracion_bloque_min', '45'::jsonb, 'Duración de bloque por defecto en minutos'),
  ('retencion_dias', '365'::jsonb, 'Días de retención del historial')
on conflict (clave) do nothing;
