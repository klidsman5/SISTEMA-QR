---
description: "Task list for reportes y dashboard"
---

# Tasks: Reportes y dashboard

**Input**: Design documents from `specs/007-reportes-dashboard/`

**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, contratos en `specs/001-asistencia-qr-escolar/contracts/` ✅

**Tests**: incluidos (alcance por rol y coincidencia pantalla/archivo son criterios medibles).

## Format: `[ID] [P?] [Story] Descripción`

- **[Story]**: US1 exportación, US2 filtros, US3 dashboard, US4 auditoría de reportes.

## Phase 1: Setup

- [X] T001 [P] Instalar `recharts`, `exceljs` y `pdf-lib` si no están en `package.json`
- [ ] T002 [P] Crear layout de reportes en `app/(admin)/admin/reportes/layout.tsx`

---

## Phase 2: Foundational

- [X] T003 Migración de vistas `v_asistencia_detalle`, `v_asistencia_diaria` y `v_metricas_mensuales` en `supabase/migrations/20261117050100_vistas_reportes.sql`
- [ ] T004 [P] Índices por fecha y por alumno en las tablas de asistencia
- [X] T005 [P] Migración de `reportes_generados` en `supabase/migrations/20261117050200_reportes_generados.sql`
- [X] T006 [P] Esquema zod compartido de filtros en `src/features/reportes/filters.ts`
- [X] T007 Función `buildQuery(filtros, alcance)` que aplica el alcance del rol en `src/features/reportes/query.ts`
- [X] T008 [P] Helper de formato de fechas y zona horaria en `src/lib/format/fecha.ts`
- [X] T009 [P] Componente de tabla filtrable reutilizable en `src/components/tables/DataTable.tsx`

**Checkpoint**: vistas y filtros listos.

---

## Phase 3: US2 — Filtrar por nivel, estado y estructura (P1) 🎯 MVP parcial

**Goal**: filtros combinables con alcance por rol.

**Independent Test**: filtrar nivel aula y estado falta; sólo aparecen esos registros.

### Tests

- [X] T010 [P] [US2] Unitarias de combinación de filtros en `tests/unit/reportes/filters.test.ts`
- [X] T011 [P] [US2] pgTAP: la vista respeta el rol en `tests/rls/vistas.test.sql`

### Implementación

- [X] T012 [US2] Endpoint `GET /reports/attendance` con filtros validados en `app/api/reports/attendance/route.ts`
- [X] T013 [US2] Pantalla de reportes con filtros de rango, alumno, grado, sección, curso, turno, nivel y estado
- [X] T014 [US2] Alcance forzado: Auxiliar sólo puerta, Docente sólo sus cursos
- [X] T015 [US2] Estado vacío claro y bloqueo de exportación vacía sin confirmación
- [ ] T016 [US2] Advertencia para rangos de más de un año

**Checkpoint**: consulta filtrada correcta.

---

## Phase 4: US1 — Exportar Excel y PDF (P1)

**Goal**: archivo idéntico a la pantalla.

**Independent Test**: exportar el mismo rango en ambos formatos y comparar.

### Tests

- [ ] T017 [P] [US1] E2E de descarga y contenido en `tests/e2e/reportes.spec.ts`

### Implementación

- [X] T018 [US1] Exportador Excel con `exceljs` en `src/lib/export/xlsx.ts`
- [X] T019 [US1] Exportador PDF con `pdf-lib` en `src/lib/export/pdf.ts`
- [ ] T020 [US1] Streaming de descarga para lotes grandes en el endpoint
- [ ] T021 [US1] Columnas: fecha, hora, alumno, grado, sección, curso, turno, nivel, estado, aprobador
- [ ] T022 [US1] Botones de exportación con estado de progreso
- [ ] T023 [US1] Reporte de 1,000 alumnos sin bloquear a otros usuarios

**Checkpoint**: entrega formal de información.

---

## Phase 5: US3 — Dashboard (P2)

**Goal**: KPIs y gráficos interactivos por rol.

**Independent Test**: porcentajes coinciden con cálculo manual de una muestra.

### Tests

- [X] T024 [P] [US3] Unitarias de cálculo de porcentajes en `tests/unit/reportes/metricas.test.ts`

### Implementación

- [X] T025 [US3] Endpoint `GET /dashboard/summary` con caché de 60 s
- [X] T026 [US3] Tarjetas KPI con icono circular y barra de progreso degradada en `src/features/dashboard/KpiCard.tsx`
- [X] T027 [US3] Gráficos Recharts de línea, barra y dona con la paleta de estados
- [X] T028 [US3] Filtro de mes y rango con recálculo en menos de 3 s
- [ ] T029 [US3] Dashboard acotado al Docente y oculto para el Auxiliar
- [ ] T030 [US3] Estado de carga y error de datos

**Checkpoint**: analítica disponible.

---

## Phase 6: US4 — Auditar reportes (P2)

- [X] T031 [US4] Registrar cada exportación en `reportes_generados` con usuario, filtros y formato
- [X] T032 [US4] Registrar también las exportaciones fallidas
- [ ] T033 [US4] Pantalla de auditoría de reportes en `app/(admin)/admin/reportes/auditoria/page.tsx`

**Checkpoint**: extracciones trazables.

---

## Phase 7: Polish

- [ ] T034 [P] Pruebas de rendimiento con un mes de 1,000 alumnos
- [ ] T035 [P] Revisar contraste de badges, KPIs y leyendas de gráficos
- [ ] T036 Ejecutar `specs/007-reportes-dashboard/quickstart.md`
- [X] T037 Revisar que ningún reporte incluya datos de apoderados (no existen)
- [X] T038 Revisar que las exportaciones no incluyan eventos pendientes de sincronizar
- [X] T039 Unir `matriculas` por el `matricula_id` del registro en `v_asistencia_detalle` en `supabase/migrations/20261117050300_vista_matricula_historica.sql`
- [ ] T040 Incluir usuario, alcance, rango y filtros en la clave de caché del dashboard en `app/api/dashboard/summary/route.ts`
- [ ] T041 [P] Probar que un reporte histórico conserva el grado y la sección del evento en `tests/unit/reportes/matricula-historica.test.ts`

---

## Dependencies & Execution Order

- Setup (T001–T002) → Foundational (T003–T009).
- US2 (T010–T016) primero: define el contrato de filtros.
- US1 (T017–T023) depende de US2.
- US3 (T024–T030) depende de las vistas; puede ir en paralelo con US1.
- US4 (T031–T033) depende de US1.
- Polish al final.

## Notes

- Una sola consulta base para pantalla y archivo evita divergencias.
- El dashboard se cachea 60 s; los reportes no.
- El Auxiliar no tiene dashboard por diseño.

## Estado de la implementación

- **25 de 41 tareas completadas.**
- `npm test`: 70 pruebas en 15 archivos, todas en verde.
- `npm run typecheck` y `npm run build`: sin errores.
- SQL para Supabase: `supabase/reportes_cloud.sql`.
- **Pendientes:**
  - **T002**: layout propio de reportes (usa el del área administrativa).
  - **T004**: índices adicionales para rangos grandes.
  - **T016, T022, T030**: avisos de rango, barra de progreso y estados de carga.
  - **T017**: E2E de descargas.
  - **T020**: descarga en streaming (hoy genera el archivo completo en memoria).
  - **T021**: columna del aprobador de la justificación.
  - **T023, T034**: pruebas de volumen y rendimiento.
  - **T029**: dashboard para Docente (hoy sólo Administrador).
  - **T033**: pantalla de auditoría de reportes.
  - **T035, T036**: revisión visual y quickstart.
  - **T040, T041**: caché por rango y prueba de matrícula histórica.
