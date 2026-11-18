begin;
create extension if not exists pgtap;

select plan(7);

select has_table('public', 'sesiones_clase', 'existe sesiones_clase');
select has_table('public', 'asistencias_curso', 'existe asistencias_curso');
select has_index('public', 'sesiones_clase', 'sesion_abierta_por_curso', 'una sesión abierta por curso');
select rls_enabled('public', 'asistencias_curso', 'RLS activo en aula');
select has_function('public', 'registrar_asistencia_curso', 'existe el registro de aula');
select has_function('public', 'cerrar_sesion', 'existe el cierre de sesión');
select has_column('public', 'asistencias_curso', 'actualizada_en', 'existe la marca de reconciliación');

select * from finish();
rollback;
