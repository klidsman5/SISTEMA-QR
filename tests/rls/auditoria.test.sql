begin;
create extension if not exists pgtap;

select plan(5);

select has_table('public', 'auditoria', 'existe la tabla auditoria');
select rls_enabled('public', 'auditoria', 'RLS activo en auditoria');
select policies_are(
  'public', 'auditoria',
  array['auditoria_select'],
  'sólo lectura para Administrador'
);
select has_function('public', 'registrar_auditoria', 'existe el trigger de auditoría');
select has_trigger('public', 'usuarios', 'trg_auditoria', 'usuarios audita cambios');

select * from finish();
rollback;
