begin;
create extension if not exists pgtap;

select plan(6);

select has_table('public', 'alumnos', 'existe alumnos');
select has_table('public', 'credenciales', 'existe credenciales');
select has_column('public', 'alumnos', 'foto_url', 'existe foto opcional');
select has_index('public', 'credenciales', 'credencial_vigente_por_alumno', 'índice de credencial vigente');
select has_function('public', 'importar_alumnos', 'existe importación transaccional');
select has_function('public', 'dar_baja_ausentes', 'existe baja de ausentes');

select * from finish();
rollback;
