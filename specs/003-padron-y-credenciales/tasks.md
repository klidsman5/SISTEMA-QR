---
description: "Task list for padrón y credenciales"
---

# Tasks: Padrón y credenciales

**Input**: Design documents from `specs/003-padron-y-credenciales/`

**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, contratos en `specs/001-asistencia-qr-escolar/contracts/` ✅

**Tests**: incluidos (validación de importación, unicidad y generación de QR son reglas críticas).

## Format: `[ID] [P?] [Story] Descripción`

- **[Story]**: US1 importación, US2 carnets, US3 revocación, US4 ciclo anual.

## Phase 1: Setup

- [X] T001 [P] Instalar `exceljs`, `papaparse`, `qrcode`, `pdf-lib` en `package.json`
- [X] T002 [P] Crear fixtures de prueba en `tests/fixtures/` (`padron_1000.xlsx`, `padron_con_errores.csv`, `padron_anio_nuevo.xlsx`, `padron_acentos_utf8.csv`)
- [X] T003 [P] Crear layout de la sección padrón en `app/(admin)/admin/padron/layout.tsx`

---

## Phase 2: Foundational (bloquea las historias)

- [X] T004 Migración de `alumnos`, `matriculas`, `credenciales` e `importaciones` en `supabase/migrations/20261117010100_padron_schema.sql`
- [X] T005 [P] Índices únicos: DNI, credencial vigente por alumno y matrícula por año en la misma migración
- [X] T006 [P] Políticas RLS del padrón según `001/contracts/rls.md`
- [X] T007 [P] Esquemas zod de fila de padrón y de confirmación en `src/features/admin/padron/schema.ts`
- [X] T008 Parser CSV y XLSX con detección de columnas obligatorias en `src/features/admin/padron/parser.ts`
- [X] T009 [P] Generador de QR con formato `ASIS:<uuid>` en `src/lib/qr/generator.ts`
- [X] T010 [P] Función de auditoría de importaciones y emisión de credenciales

**Checkpoint**: esquema y parser listos; ninguna pantalla aún.

---

## Phase 3: US1 — Carga masiva (P1) 🎯 MVP

**Goal**: importar 1,000 alumnos con validación previa y errores por fila.

**Independent Test**: importar un archivo con 10 errores y verificar 990 alumnos creados y 10 errores reportados.

### Tests

- [X] T011 [P] [US1] Unitarias de validación por fila en `tests/unit/padron/validacion.test.ts`
- [X] T012 [P] [US1] Unitarias de duplicados dentro del archivo y contra la base en `tests/unit/padron/duplicados.test.ts`
- [X] T013 [P] [US1] pgTAP de unicidad de DNI en `tests/rls/alumnos.test.sql`

### Implementación

- [X] T014 [US1] Endpoint de vista previa `POST /admin/padron/import` en `app/api/admin/padron/import/route.ts`
- [X] T015 [US1] Token de importación con expiración de 30 minutos en `src/features/admin/padron/import-token.ts`
- [X] T016 [US1] Endpoint de confirmación transaccional `POST /admin/padron/confirm` en `app/api/admin/padron/confirm/route.ts`
- [X] T017 [US1] Generación de credencial por alumno al confirmar, en la misma transacción
- [X] T018 [US1] Pantalla de importación con resumen de válidas y errores en `app/(admin)/admin/padron/importar/page.tsx`
- [X] T019 [US1] Descarga del reporte de errores en CSV
- [X] T020 [US1] Validación de grados y secciones activos antes de confirmar

**Checkpoint**: padrón cargado y credenciales emitidas.

---

## Phase 4: US2 — Carnets en PDF (P2)

**Goal**: PDF imprimible filtrado por grado y sección.

**Independent Test**: generar 3ro B y verificar un carnet por alumno con QR legible.

### Tests

- [X] T021 [P] [US2] E2E de generación y descarga del PDF en `tests/e2e/padron-carnets.spec.ts`
- [X] T022 [P] [US2] Unitaria de selección de alumnos por filtro en `tests/unit/padron/carnets.test.ts`

### Implementación

- [X] T023 [US2] Plantilla de carnet (10 por hoja A4) en `src/features/admin/padron/carnet-template.ts`
- [X] T024 [US2] Render de PDF con streams en `src/lib/export/pdf.ts`
- [X] T025 [US2] Endpoint `GET /admin/credenciales/pdf` con filtros en `app/api/admin/credenciales/pdf/route.ts`
- [ ] T026 [US2] Pantalla de selección de grado, sección y foto opcional en `app/(admin)/admin/credenciales/page.tsx`
- [ ] T027 [US2] Indicador de progreso para lotes de 1,000

**Checkpoint**: carnets listos para imprimir.

---

## Phase 5: US3 — Revocar y reemitir (P2)

**Goal**: invalidar una credencial perdida y emitir otra.

**Independent Test**: revocar, escanear la anterior y verificar rechazo; escanear la nueva y verificar registro.

### Tests

- [X] T028 [P] [US3] pgTAP: una sola credencial vigente y rechazo de revocadas en `tests/rls/credenciales.test.sql`

### Implementación

- [X] T029 [US3] Función `revocar_credencial(alumno, motivo)` con auditoría en `supabase/migrations/20261117010200_revocar.sql`
- [X] T030 [US3] Reemisión con nuevo `qr_uuid` y PDF individual en `src/features/admin/padron/reemitir.ts`
- [X] T031 [US3] Endpoint `POST /admin/credenciales/revocar` en `app/api/admin/credenciales/revocar/route.ts`
- [X] T032 [US3] Acción y confirmación en la ficha del alumno

**Checkpoint**: credenciales gestionables durante el año.

---

## Phase 6: US4 — Ciclo anual (P2)

**Goal**: padrón nuevo sin perder historial.

**Independent Test**: cargar un padrón con un cambio de sección y un alumno ausente; verificar historial y baja.

### Tests

- [ ] T033 [P] [US4] Integración de carga anual en `tests/integration/padron-anual.test.ts`

### Implementación

- [X] T034 [US4] Endpoint `POST /admin/padron/anio` en `app/api/admin/padron/anio/route.ts`
- [X] T035 [US4] Actualización de `matriculas` y baja de ausentes en una transacción
- [X] T036 [US4] Revocación de credenciales del año anterior y emisión de las nuevas
- [ ] T037 [US4] Pantalla de confirmación con resumen de cambios antes de aplicar
- [X] T038 [US4] Bloqueo de la carga anual si hay importaciones pendientes

**Checkpoint**: cambio de año resuelto.

---

## Phase 7: Polish

- [ ] T039 [P] Actualizar `padron_cache` local al iniciar sesión (contrato con 008)
- [ ] T040 [P] Pruebas de carga: 1,000 filas y PDF completo
- [ ] T041 Ejecutar `specs/003-padron-y-credenciales/quickstart.md`
- [X] T042 Revisar que el QR no contenga datos personales
- [X] T043 Revisar que la importación no cree cuentas de alumno
- [X] T044 [P] Probar acentos y caracteres especiales con `padron_acentos_utf8.csv` en `tests/unit/padron/utf8.test.ts`
- [X] T045 Añadir `foto_url` al padrón y mostrarla en el carnet cuando exista, en `supabase/migrations/20261117010300_foto_alumno.sql`

---

## Dependencies & Execution Order

- Setup (T001–T003) → Foundational (T004–T010) bloquea todo. T045 (foto) puede ir con US2 sin bloquear T021–T027.
- US1 (T011–T020) es el MVP.
- US2 (T021–T027) depende de US1 (alumnos y credenciales).
- US3 (T028–T032) depende de US2 (PDF individual) y de US1.
- US4 (T033–T038) depende de US1 y US3.
- Polish al final.

## Notes

- Toda escritura de padrón es exclusiva del Administrador.
- Las credenciales se generan en servidor; nunca en el navegador.
- El archivo de importación no se persiste: se procesa en memoria y se descarta.

## Estado de la implementación

- **38 de 45 tareas completadas.** Código en `src/features/admin/padron/`, `app/(admin)/admin/padron/`,
  `app/(admin)/admin/credenciales/`, `app/api/admin/credenciales/` y migraciones `20261117010100` a
  `20261117010400`.
- `npm test`: 48 pruebas en 11 archivos, todas en verde.
- `npm run typecheck` y `npm run build`: sin errores.
- SQL para Supabase en la nube: `supabase/padron_cloud.sql`.
- **Pendientes:**
  - **T026**: carga de foto desde el panel (el campo `foto_url` existe, pero no hay formulario).
  - **T027**: indicador de progreso para lotes de 1.000 carnets.
  - **T033**: prueba de integración del ciclo anual completo.
  - **T037**: pantalla de resumen previo al cierre anual.
  - **T039**: caché local del padrón; pertenece al módulo 008.
  - **T040**: prueba de carga de 1.000 filas y PDF completo.
  - **T041**: ejecutar el quickstart contra Supabase real.
