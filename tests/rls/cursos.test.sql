begin;
create extension if not exists pgtap;

select plan(6);

select has_table('public', 'cursos', 'existe la tabla cursos');
select has_column('public', 'cursos', 'duracion_bloque_min', 'existe la duración de bloque');
select rls_enabled('public', 'cursos', 'RLS activo en cursos');
select policies_are(
  'public', 'cursos',
  array['cursos_select', 'cursos_write'],
  'políticas de cursos'
);
select has_function('public', 'cursos_solapados', 'existe la detección de solapamiento');
select has_trigger('public', 'cursos', 'trg_validar_docente_curso', 'valida el rol docente');

select * from finish();
rollback;
