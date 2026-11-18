---
description: "Task list for asistencia de puerta"
---

# Tasks: Asistencia de puerta

**Input**: Design documents from `specs/004-asistencia-puerta/`

**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, contratos en `specs/001-asistencia-qr-escolar/contracts/` ✅

**Tests**: incluidos (estado, debounce, cierre y offline son reglas críticas).

## Format: `[ID] [P?] [Story] Descripción`

- **[Story]**: US1 registro, US2 debounce, US3 cierre, US4 consulta.

## Phase 1: Setup

- [X] T001 [P] Instalar `@zxing/browser` y tipar `BarcodeDetector` en `package.json` y `src/types/barcode.d.ts`
- [X] T002 [P] Crear layout del área de puerta en `app/(puerta)/layout.tsx` con acento cian
- [ ] T003 [P] Consumir el caché de padrón provisto por 008 en `src/features/puerta/resolver-credential.ts` (no crear un segundo caché)

---

## Phase 2: Foundational

- [X] T004 Migración de `asistencias_puerta` y `cierres_jornada` con sus restricciones en `supabase/migrations/20261117020100_puerta_schema.sql`
- [X] T005 [P] Índice `(alumno_id, fecha)` único y `(fecha, estado)` en la misma migración
- [X] T006 [P] Políticas RLS de puerta en `supabase/migrations/20261117020110_puerta_rls.sql`
- [X] T007 Función `registrar_asistencia_puerta(evento jsonb)` en `supabase/migrations/20261117020200_registrar_puerta.sql`
- [ ] T008 [P] Función `evaluar_debounce(contexto, alumno, ocurrido)` en `supabase/migrations/20261117020210_debounce.sql`
- [X] T009 [P] Helper `src/lib/rules/estado.ts` con el cálculo Puntual/Tardanza
- [X] T010 [P] Componente de escáner con marco, esquinas y línea animada en `src/components/scanner/QrScanner.tsx`
- [X] T011 [P] Componente de tarjeta de resultado con contraste 7:1 en `src/components/scanner/ResultCard.tsx`
- [X] T012 [P] Endpoint `POST /attendance/gate` en `app/api/attendance/gate/route.ts`

**Checkpoint**: funciones SQL y componentes listos; nada conectado aún.

---

## Phase 3: US1 — Registrar entrada (P1) 🎯 MVP

**Goal**: escaneo con confirmación inmediata y estado correcto.

**Independent Test**: escanear dentro y fuera de tolerancia y verificar estados y datos mostrados.

### Tests

- [X] T013 [P] [US1] Unitarias de límites de tolerancia en `tests/unit/rules/estado.test.ts`
- [X] T014 [P] [US1] pgTAP de cálculo de estado y congelado de regla en `tests/rls/puerta.test.sql`
- [ ] T015 [P] [US1] E2E de escaneo y confirmación en `tests/e2e/puerta.spec.ts`

### Implementación

- [X] T016 [US1] Pantalla de escaneo en `app/(puerta)/puerta/escanear/page.tsx`
- [ ] T017 [US1] Resolución del QR contra `padron_cache` y llamada al endpoint
- [X] T018 [US1] Tarjeta de resultado con nombre, grado, sección y hora; cierre a los 3 segundos
- [X] T019 [US1] Manejo de errores: credencial revocada, código desconocido, alumno de baja
- [X] T020 [US1] Registro manual con motivo en `app/(puerta)/puerta/escanear/manual.tsx`
- [ ] T021 [US1] Precarga del turno activo y protección contra escaneo en turno equivocado

**Checkpoint**: una entrada real queda registrada.

---

## Phase 4: US2 — Debounce y una entrada diaria (P1)

**Goal**: evitar duplicados sin bloquear el aula.

**Independent Test**: dos escaneos en 2 min y luego registro en aula.

### Tests

- [ ] T022 [P] [US2] pgTAP: debounce por contexto y una entrada diaria en `tests/rls/debounce.test.sql`

### Implementación

- [X] T023 [US2] Integrar `evaluar_debounce` en la función de registro con contexto `puerta`
- [X] T024 [US2] Respuesta `duplicado` con aviso visual y sonido opcional
- [X] T025 [US2] Restricción `unique(alumno_id, fecha)` y mensaje específico
- [ ] T026 [US2] Prueba de que el registro de aula no se bloquea tras la puerta

**Checkpoint**: sin duplicados en puerta.

---

## Phase 5: US3 — Cierre de jornada (P2)

**Goal**: faltas del turno al cerrar, idempotente.

**Independent Test**: 20 sin entrada → 20 faltas; dos ejecuciones sin duplicar.

### Tests

- [ ] T027 [P] [US3] pgTAP del cierre idempotente en `tests/rls/cierre-jornada.test.sql`
- [ ] T028 [P] [US3] Integración de cierre con permisos previos en `tests/integration/cierre-permisos.test.ts`

### Implementación

- [X] T029 [US3] Función `cerrar_jornada(turno, fecha)` en `supabase/migrations/20261117020300_cierre_jornada.sql`
- [X] T030 [US3] Faltas con `origen = 'cierre'` y `evento_id` determinista
- [ ] T031 [US3] Programación con pg_cron a la hora de cierre de cada turno
- [X] T032 [US3] Endpoint `POST /attendance/close-day` y `GET /attendance/close-day/precheck`
- [X] T033 [US3] Pantalla de cierre con precheck de pendientes y confirmación
- [X] T034 [US3] Respeto de permisos previos vigentes

**Checkpoint**: jornada cerrada sin duplicados.

---

## Phase 6: US4 — Consulta del día (P2)

**Goal**: el Auxiliar ve los registros de puerta del día.

**Independent Test**: el listado coincide con los escaneos realizados.

### Implementación

- [X] T035 [US4] Endpoint `GET /attendance/gate/today` en `app/api/attendance/gate/today/route.ts`
- [X] T036 [US4] Pantalla de registros del día con búsqueda por alumno
- [X] T037 [US4] Estado vacío y contador de alumnos sin entrada
- [ ] T038 [US4] Prueba de que el Auxiliar no ve registros de aula

**Checkpoint**: módulo completo.

---

## Phase 7: Polish

- [ ] T039 [P] Pruebas de carga de 1,000 entradas en 15 minutos
- [ ] T040 [P] Verificar reducción de movimiento y contraste de la tarjeta
- [ ] T041 Ejecutar `specs/004-asistencia-puerta/quickstart.md`
- [X] T042 Revisar que no exista ningún flujo de salida ni de notificación
- [X] T043 Revisar el comportamiento con reloj desfasado (`requiere_revision`)
- [X] T044 Implementar el UPSERT de reconciliación en `registrar_asistencia_puerta` en `supabase/migrations/20261117020400_reconciliacion_puerta.sql`
- [ ] T045 Escribir auditoría del estado anterior al reconciliar (FR-017) en la misma migración
- [ ] T046 [P] pgTAP: entrada después de permiso y después del cierre en `tests/rls/reconciliacion-puerta.test.sql`
- [X] T047 Ajustar la respuesta de sync para informar `reconciliado` en lugar de `duplicado` cuando actualiza una fila

---

## Dependencies & Execution Order

- Setup (T001–T003) → Foundational (T004–T012) bloquea las historias.
- US1 (T013–T021) es el MVP.
- US2 (T022–T026 y T044–T047) depende de US1; la reconciliación debe existir antes de conectar 008.
- US3 (T027–T034) depende de US1 y de 006 (permisos); puede desarrollarse con un stub de permisos.
- US4 (T035–T038) depende de US1.
- Polish al final.

## Notes

- Sólo se registran entradas; no crear rutas de salida.
- El estado se congela con la regla vigente al momento del evento.
- Toda la lógica de debounce y cierre vive en SQL para que sea la única autoridad.

## Estado de la implementación

- **29 de 43 tareas completadas.**
- `npm test`: 54 pruebas en 12 archivos, todas en verde.
- `npm run typecheck` y `npm run build`: sin errores.
- SQL para Supabase: `supabase/puerta_cloud.sql`.
- **Pendientes:**
  - **T003, T017**: resolución local del QR contra el caché del padrón; llega con el módulo 008.
  - **T008, T022**: función y pruebas formales de debounce; hoy el debounce está integrado en `registrar_asistencia_puerta` y lee `configuracion`.
  - **T015**: E2E de escaneo con cámara simulada.
  - **T021**: precarga del turno activo.
  - **T026, T027, T028, T038**: pruebas de integración y de alcance entre roles.
  - **T031**: programación con pg_cron del cierre.
  - **T039, T040, T041**: pruebas de carga, revisión visual y quickstart.
  - **T045, T046**: auditoría del estado anterior al reconciliar y su prueba pgTAP.
