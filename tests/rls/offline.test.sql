begin;
create extension if not exists pgtap;

select plan(5);

select has_table('public', 'eventos_descartados', 'existe eventos_descartados');
select has_table('public', 'revisiones', 'existe revisiones');
select rls_enabled('public', 'eventos_descartados', 'RLS activo en descartes');
select rls_enabled('public', 'revisiones', 'RLS activo en revisiones');
select has_column('public', 'revisiones', 'estado', 'las revisiones tienen estado');

select * from finish();
rollback;
