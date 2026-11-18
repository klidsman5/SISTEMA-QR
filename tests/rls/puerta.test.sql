begin;
create extension if not exists pgtap;

select plan(7);

select has_table('public', 'asistencias_puerta', 'existe asistencias_puerta');
select has_table('public', 'cierres_jornada', 'existe cierres_jornada');
select has_index('public', 'asistencias_puerta', 'asistencias_puerta_evento_id_key', 'índice único por evento');
select rls_enabled('public', 'asistencias_puerta', 'RLS activo en puerta');
select has_function('public', 'registrar_asistencia_puerta', 'existe la función de registro');
select has_function('public', 'cerrar_jornada', 'existe el cierre de jornada');
select has_function('public', 'uuid_determinista', 'existe el generador determinista');

select * from finish();
rollback;
