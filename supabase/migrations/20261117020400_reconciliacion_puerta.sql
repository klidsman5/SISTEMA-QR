-- La reconciliación vive en registrar_asistencia_puerta (20261117020200).
-- Este archivo deja constancia del contrato y añade el índice de búsqueda por evento.
create index if not exists puerta_evento_idx on public.asistencias_puerta (evento_id);

comment on function public.registrar_asistencia_puerta(jsonb) is
  'Única autoridad de puerta: idempotencia por evento_id, debounce y reconciliación de permiso/cierre.';
