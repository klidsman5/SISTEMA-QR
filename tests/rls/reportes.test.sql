begin;
create extension if not exists pgtap;

select plan(6);

select has_view('public', 'v_asistencia_detalle', 'existe la vista de detalle');
select has_view('public', 'v_asistencia_diaria', 'existe la vista diaria');
select has_view('public', 'v_metricas_mensuales', 'existe la vista de métricas');
select has_table('public', 'reportes_generados', 'existe la auditoría de reportes');
select rls_enabled('public', 'reportes_generados', 'RLS activo en reportes');
select has_column('public', 'reportes_generados', 'filtros', 'guarda los filtros aplicados');

select * from finish();
rollback;
