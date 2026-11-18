begin;
create extension if not exists pgtap;

select plan(6);

select has_table('public', 'justificaciones', 'existe justificaciones');
select has_table('public', 'justificaciones_historial', 'existe el historial');
select rls_enabled('public', 'justificaciones', 'RLS activo');
select has_index('public', 'justificaciones', 'justificacion_vigente_unica', 'una justificación vigente por día y nivel');
select has_function('public', 'aplicar_justificacion', 'existe aplicar_justificacion');
select has_function('public', 'revertir_justificacion', 'existe revertir_justificacion');

select * from finish();
rollback;
