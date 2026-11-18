-- Auditoría automática de la estructura y las cuentas.
create or replace function public.registrar_auditoria()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_accion text;
  v_anterior jsonb;
  v_nuevo jsonb;
begin
  if tg_op = 'INSERT' then
    v_accion := 'insert';
  elsif tg_op = 'DELETE' then
    v_accion := 'delete';
  elsif tg_op = 'UPDATE' and (to_jsonb(old) ->> 'activo') = 'true'
        and (to_jsonb(new) ->> 'activo') = 'false' then
    v_accion := 'deactivate';
  else
    v_accion := 'update';
  end if;

  v_anterior := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  v_nuevo := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;

  insert into public.auditoria (usuario_id, accion, entidad, entidad_id, valor_anterior, valor_nuevo)
  values (public.usuario_id_actual(), v_accion, tg_table_name,
          coalesce((to_jsonb(new) ->> 'id')::uuid, (to_jsonb(old) ->> 'id')::uuid),
          v_anterior, v_nuevo);

  return coalesce(new, old);
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array['usuarios', 'turnos', 'grados', 'secciones', 'cursos']
  loop
    execute format('drop trigger if exists trg_auditoria on public.%I', t);
    execute format(
      'create trigger trg_auditoria after insert or update or delete on public.%I
       for each row execute function public.registrar_auditoria()', t);
  end loop;
end $$;
