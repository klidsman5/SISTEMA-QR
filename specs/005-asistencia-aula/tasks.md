---
description: "Task list for asistencia de aula"
---

# Tasks: Asistencia de aula

**Input**: Design documents from `specs/005-asistencia-aula/`

**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, contratos en `specs/001-asistencia-qr-escolar/contracts/` ✅

**Tests**: incluidos (alcance por curso, sección y cierre son reglas críticas).

## Format: `[ID] [P?] [Story] Descripción`

- **[Story]**: US1 registro por credencial, US2 cierre con faltas, US3 alcance del Docente.

## Phase 1: Setup

- [X] T001 [P] Crear layout del área de aula en `app/(docente)/layout.tsx` con acento teal
- [X] T002 [P] Reutilizar `QrScanner` y `ResultCard` de 004 (`src/components/scanner/`)
- [ ] T003 [P] Crear utilidad de selección de curso del día en `src/features/aula/curso-activo.ts`

---

## Phase 2: Foundational

- [X] T004 Migración de `sesiones_clase` y `asistencias_curso` en `supabase/migrations/20261117030100_aula_schema.sql`
- [X] T005 [P] Índice parcial único de sesión abierta por curso y fecha; unique(`sesion_id`, `alumno_id`)
- [X] T006 [P] Políticas RLS de aula en `supabase/migrations/20261117030110_aula_rls.sql`
- [X] T007 Función `registrar_asistencia_curso(evento jsonb)` en `supabase/migrations/20261117030200_registrar_aula.sql`
- [X] T008 [P] Función `cerrar_sesion(sesion uuid)` en `supabase/migrations/20261117030300_cerrar_sesion.sql`
- [X] T009 [P] Endpoint `GET /sesiones` y `POST /sesiones` en `app/api/sesiones/route.ts`
- [X] T010 [P] Endpoint `POST /attendance/class` en `app/api/attendance/class/route.ts`

**Checkpoint**: esquema y funciones listos.

---

## Phase 3: US3 — Alcance del Docente (P1, control previo al registro)

**Goal**: sólo los cursos propios son visibles y utilizables.

**Independent Test**: el Docente de 3ro B no puede abrir 4to A ni por URL.

### Tests

- [X] T011 [P] [US3] pgTAP: sesiones y asistencias ajenas inaccesibles en `tests/rls/aula.test.sql`

### Implementación

- [X] T012 [US3] Guard de curso asignado en `src/features/aula/require-curso.ts`
- [X] T013 [US3] Filtro de cursos del Docente en el endpoint de sesiones
- [X] T014 [US3] Mensaje y redirección al intentar un curso ajeno

**Checkpoint**: alcance garantizado antes de exponer datos.

---

## Phase 4: US1 — Registrar por credencial (P1) 🎯 MVP

**Goal**: escanear credenciales dentro de una sesión abierta.

**Independent Test**: 30 credenciales de la sección, cada una registrada una vez.

### Tests

- [X] T015 [P] [US1] Unitarias de validación de sección y sesión en `tests/unit/aula/registro.test.ts`
- [ ] T016 [P] [US1] E2E de apertura, escaneo y lista en `tests/e2e/aula.spec.ts`

### Implementación

- [X] T017 [US1] Pantalla de selección de curso y apertura de sesión en `app/(docente)/aula/page.tsx`
- [X] T018 [US1] Pantalla de escaneo de la sesión en `app/(docente)/aula/[sesionId]/page.tsx`
- [X] T019 [US1] Lista de presentes en vivo con hora y estado
- [X] T020 [US1] Rechazo de alumnos de otra sección y credenciales revocadas
- [X] T021 [US1] Estado Puntual/Tardanza según hora de apertura y tolerancia del curso
- [X] T022 [US1] Debounce por contexto `curso:<id>` (5 min)
- [ ] T023 [US1] Registro offline con la cola de 008
- [ ] T024 [US1] Cierre automático de sesiones olvidadas al terminar el bloque

**Checkpoint**: asistencia de aula operativa.

---

## Phase 5: US2 — Cierre de sesión y faltas (P2)

**Goal**: marcar faltas de los ausentes, idempotente.

**Independent Test**: 25 de 30 registrados → 5 faltas; segundo cierre sin duplicar.

### Tests

- [ ] T025 [P] [US2] pgTAP de cierre de sesión idempotente en `tests/rls/cierre-sesion.test.sql`

### Implementación

- [X] T026 [US2] Endpoint `POST /sesiones/{id}/cerrar` en `app/api/sesiones/[id]/cerrar/route.ts`
- [X] T027 [US2] Endpoint `GET /sesiones/{id}/roster` con presentes y ausentes
- [X] T028 [US2] Pantalla de cierre con confirmación y resumen
- [X] T029 [US2] Faltas con `origen = 'cierre'` y respeto de permisos previos
- [X] T030 [US2] Bloqueo de registros en sesiones cerradas

**Checkpoint**: faltas de aula confiables.

---

## Phase 6: Polish

- [ ] T031 [P] Pruebas de 35 alumnos en menos de 3 minutos
- [X] T032 [P] Verificar que no existe ningún QR de sesión ni flujo de alumno con teléfono
- [ ] T033 Ejecutar `specs/005-asistencia-aula/quickstart.md`
- [X] T034 Revisar que la asistencia de aula no altera la de puerta
- [ ] T035 Revisar accesibilidad y contraste de la lista de aula
- [X] T036 Implementar UPSERT de reconciliación en `registrar_asistencia_curso` en `supabase/migrations/20261117030400_reconciliacion_aula.sql`
- [ ] T037 Auditar el estado anterior al reconciliar (FR-015)
- [ ] T038 [P] pgTAP: registro después del cierre de sesión en `tests/rls/reconciliacion-aula.test.sql`
- [ ] T039 Cerrar la sesión automáticamente usando `hora_inicio + duracion_bloque_min` de 002 en `src/features/aula/cierre-automatico.ts`

---

## Dependencies & Execution Order

- Setup (T001–T003) → Foundational (T004–T010).
- US3 (T011–T014) va primero: es el control de acceso del módulo.
- US1 (T015–T024) es el MVP funcional y depende de US3.
- US2 (T025–T030 y T036–T039) depende de US1; la reconciliación debe existir antes de conectar 008.
- Polish al final.

## Notes

- El alumno nunca usa teléfono ni cuenta.
- Una sola sesión abierta por curso y fecha.
- El cierre de sesión no depende del cierre de jornada de puerta.

## Estado de la implementación

- **28 de 39 tareas completadas.**
- `npm test`: 59 pruebas en 13 archivos, todas en verde.
- `npm run typecheck` y `npm run build`: sin errores.
- SQL para Supabase: `supabase/aula_cloud.sql`.
- **Pendientes:**
  - **T003**: utilidad de curso activo según horario (hoy se elige entre todos los cursos asignados).
  - **T016**: E2E de aula.
  - **T023**: registro offline; corresponde al módulo 008.
  - **T024, T039**: cierre automático al terminar el bloque.
  - **T025, T038**: pruebas pgTAP de cierre y reconciliación.
  - **T031, T033, T035**: carga, quickstart y accesibilidad.
  - **T037**: auditoría del estado anterior al reconciliar.
