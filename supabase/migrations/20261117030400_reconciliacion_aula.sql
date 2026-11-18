-- La reconciliación de faltas vive en registrar_asistencia_curso (20261117030200).
create index if not exists asistencias_curso_evento_idx on public.asistencias_curso (evento_id);

comment on function public.registrar_asistencia_curso(jsonb) is
  'Única autoridad de aula: idempotencia, debounce por curso y reconciliación de faltas del cierre.';

-- Auditoría de sesiones y asistencias de aula.
drop trigger if exists trg_auditoria on public.sesiones_clase;
create trigger trg_auditoria
  after insert or update or delete on public.sesiones_clase
  for each row execute function public.registrar_auditoria();
