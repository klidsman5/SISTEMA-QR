---
description: "Task list for justificaciones y permisos"
---

# Tasks: Justificaciones y permisos

**Input**: Design documents from `specs/006-justificaciones/`

**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, contratos en `specs/001-asistencia-qr-escolar/contracts/` ✅

**Tests**: incluidos (trazabilidad y alcance son reglas críticas de la constitución).

## Format: `[ID] [P?] [Story] Descripción`

- **[Story]**: US1 justificación posterior, US2 permiso previo, US3 reversión con historial.

## Phase 1: Setup

- [X] T001 [P] Crear layout del módulo en `app/(admin)/admin/justificaciones/layout.tsx`
- [X] T002 [P] Crear tipos compartidos de justificación en `src/features/justificaciones/types.ts`

---

## Phase 2: Foundational

- [X] T003 Migración de `justificaciones` y `justificaciones_historial` en `supabase/migrations/20261117040100_justificaciones_schema.sql`
- [X] T004 [P] Índices y unicidad de justificación vigente por alumno, fecha y referencia
- [X] T005 [P] Políticas RLS del módulo en `supabase/migrations/20261117040110_justificaciones_rls.sql`
- [X] T006 Función `aplicar_justificacion(id)` en `supabase/migrations/20261117040200_aplicar_justificacion.sql`
- [X] T007 [P] Esquema zod de alta y reversión en `src/features/justificaciones/schema.ts`
- [X] T008 [P] Endpoint `GET /justificaciones` con filtros y alcance en `app/api/justificaciones/route.ts`

**Checkpoint**: tabla, RLS y función de aplicación listas.

---

## Phase 3: US1 — Justificar una falta o tardanza (P1) 🎯 MVP

**Goal**: cambiar el estado con aprobador y motivo.

**Independent Test**: justificar una falta como Docente del curso y verificar estado y trazabilidad.

### Tests

- [X] T009 [P] [US1] Unitarias de validación de motivo y observación en `tests/unit/justificaciones/schema.test.ts`
- [X] T010 [P] [US1] pgTAP: Docente no justifica cursos ajenos en `tests/rls/justificaciones.test.sql`
- [ ] T011 [P] [US1] E2E de justificación en `tests/e2e/justificaciones.spec.ts`

### Implementación

- [X] T012 [US1] Endpoint `POST /justificaciones` en `app/api/justificaciones/route.ts`
- [X] T013 [US1] Formulario con motivo, observación y referencia al registro en `app/(docente)/aula/[sesionId]/justificar/page.tsx`
- [X] T014 [US1] Acceso desde la tabla de asistencia con indicador de justificado
- [X] T015 [US1] Validación de alcance: Docente sólo sus cursos; Administrador todos
- [X] T016 [US1] Escritura de historial y auditoría en la misma transacción
- [X] T017 [US1] Bloqueo de justificación duplicada sobre el mismo registro

**Checkpoint**: faltas y tardanzas justificables.

---

## Phase 4: US2 — Permiso previo (P2)

**Goal**: permiso para una fecha futura que evita la falta.

**Independent Test**: permiso para mañana y cierre sin entrada → justificado.

### Tests

- [ ] T018 [P] [US2] Integración de permiso previo con el cierre de jornada en `tests/integration/permiso-previo.test.ts`

### Implementación

- [X] T019 [US2] Lógica de permiso previo en `src/features/justificaciones/permiso.ts`
- [X] T020 [US2] Formulario de permiso previo con selección de fecha en `app/(admin)/admin/justificaciones/nueva/page.tsx`
- [X] T021 [US2] Integrar la consulta de permisos en `cerrar_jornada` y `cerrar_sesion`
- [X] T022 [US2] Regla: la entrada registrada prevalece sobre el permiso
- [ ] T023 [US2] Conversión automática de permiso con fecha pasada a justificación posterior

**Checkpoint**: permisos previos respetados por ambos cierres.

---

## Phase 5: US3 — Corregir con trazabilidad (P2)

**Goal**: revertir una justificación conservando ambos movimientos.

**Independent Test**: justificar, revertir y ver el historial completo.

### Tests

- [ ] T024 [P] [US3] pgTAP de reversión y conservación de historial en `tests/rls/reversion.test.sql`

### Implementación

- [X] T025 [US3] Función `revertir_justificacion(id, motivo)` en `supabase/migrations/20261117040300_revertir.sql`
- [X] T026 [US3] Endpoint `POST /justificaciones/{id}/revertir`
- [ ] T027 [US3] Pantalla de historial por alumno con quién, cuándo y motivo
- [X] T028 [US3] Estado anterior restaurado desde `valor_anterior`
- [X] T029 [US3] Impedir la reversión de una justificación ya revertida

**Checkpoint**: trazabilidad completa.

---

## Phase 6: Polish

- [ ] T030 [P] Pruebas de alcance con los tres roles
- [X] T031 [P] Verificar que el historial no se puede borrar desde la aplicación
- [ ] T032 Ejecutar `specs/006-justificaciones/quickstart.md`
- [ ] T033 Revisar textos de UI y contraste de los estados
- [X] T034 Revisar que no se registren datos de salud más allá del motivo
- [ ] T035 Probar que la entrada real reemplaza el permiso previo y deja auditoría en `tests/integration/permiso-reconciliado.test.ts`

---

## Dependencies & Execution Order

- Setup (T001–T002) → Foundational (T003–T008).
- US1 (T009–T017) es el MVP y depende de 004 y 005 para tener registros.
- US2 (T018–T023) depende de US1 y de las funciones de cierre.
- US3 (T024–T029) depende de US1.
- Polish al final.

## Notes

- Motivo y observación son obligatorios siempre.
- Una justificación nunca borra: agrega historial.
- El estado `justificado` es el único cambio que este módulo produce en la asistencia.

## Estado de la implementación

- **26 de 35 tareas completadas.**
- `npm test`: 65 pruebas en 14 archivos, todas en verde.
- `npm run typecheck` y `npm run build`: sin errores.
- SQL para Supabase: `supabase/justificaciones_cloud.sql`.
- **Pendientes:**
  - **T011**: E2E de justificaciones.
  - **T018**: prueba de integración con el cierre de jornada.
  - **T023**: conversión automática de permiso pasado a justificación posterior.
  - **T024, T035**: pruebas pgTAP de reversión y reconciliación.
  - **T027**: pantalla de historial por alumno.
  - **T030**: pruebas de alcance con los tres roles.
  - **T032, T033**: quickstart y revisión visual.
