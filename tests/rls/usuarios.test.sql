begin;
create extension if not exists pgtap;

select plan(6);

select has_table('public', 'usuarios', 'existe la tabla usuarios');
select has_column('public', 'usuarios', 'debe_cambiar_password', 'existe la marca de cambio de contraseña');
select rls_enabled('public', 'usuarios', 'RLS activo en usuarios');
select policies_are(
  'public', 'usuarios',
  array['usuarios_select', 'usuarios_update', 'usuarios_insert'],
  'políticas de usuarios'
);
select has_function('public', 'crear_perfil', 'existe crear_perfil');
select has_function('public', 'marcar_cambio_password', 'existe marcar_cambio_password');

select * from finish();
rollback;
