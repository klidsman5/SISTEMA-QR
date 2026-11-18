-- Un curso sólo se asigna a un usuario con rol docente y activo.
create or replace function public.validar_docente_curso()
returns trigger
language plpgsql
as $$
declare
  v_rol public.rol_usuario;
  v_activo boolean;
begin
  if new.docente_id is null then
    return new;
  end if;

  select rol, activo into v_rol, v_activo
  from public.usuarios where id = new.docente_id;

  if v_rol is null or v_rol <> 'docente' or not coalesce(v_activo, false) then
    raise exception 'DOCENTE_INVALIDO' using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_validar_docente_curso on public.cursos;
create trigger trg_validar_docente_curso
  before insert or update of docente_id on public.cursos
  for each row execute function public.validar_docente_curso();
