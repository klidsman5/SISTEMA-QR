-- Perfil creado por el Administrador después de crear la cuenta en Supabase Auth.
create or replace function public.crear_perfil(
  p_auth_id uuid,
  p_nombre text,
  p_username citext,
  p_rol public.rol_usuario
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.es_administrador() then
    raise exception 'SIN_PERMISO' using errcode = '42501';
  end if;

  insert into public.usuarios (auth_user_id, nombre, username, rol)
  values (p_auth_id, p_nombre, p_username, p_rol)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.crear_perfil(uuid, text, citext, public.rol_usuario) from public;
grant execute on function public.crear_perfil(uuid, text, citext, public.rol_usuario) to authenticated;

-- Restablecimiento: sólo Administrador; la clave la fija Supabase Auth desde el servidor.
create or replace function public.marcar_cambio_password(p_usuario uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.es_administrador() then
    raise exception 'SIN_PERMISO' using errcode = '42501';
  end if;
  update public.usuarios set debe_cambiar_password = true, updated_at = now() where id = p_usuario;
end;
$$;

grant execute on function public.marcar_cambio_password(uuid) to authenticated;
