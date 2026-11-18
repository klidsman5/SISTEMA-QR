-- Auditoría del padrón y de las credenciales.
drop trigger if exists trg_auditoria on public.alumnos;
create trigger trg_auditoria
  after insert or update or delete on public.alumnos
  for each row execute function public.registrar_auditoria();

drop trigger if exists trg_auditoria on public.credenciales;
create trigger trg_auditoria
  after insert or update or delete on public.credenciales
  for each row execute function public.registrar_auditoria();
