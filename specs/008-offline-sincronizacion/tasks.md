---
description: "Task list for offline-first y sincronización"
---

# Tasks: Offline-First y sincronización

**Input**: Design documents from `specs/008-offline-sincronizacion/`

**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, contratos en `specs/001-asistencia-qr-escolar/contracts/` ✅

**Tests**: incluidos (integridad de sincronización es un principio constitucional).

## Format: `[ID] [P?] [Story] Descripción`

- **[Story]**: US1 registro sin conexión, US2 sincronización por lotes, US3 conflictos, US4 indicador de estado.

## Phase 1: Setup

- [X] T001 [P] Instalar `dexie` y `dexie-react-hooks` en `package.json`
- [ ] T002 [P] Configurar PWA y service worker en `next.config.ts` y `public/manifest.json`
- [X] T003 [P] Definir `TZ_COLEGIO` y variables del cliente en `.env.example`

---

## Phase 2: Foundational

- [X] T004 Esquema Dexie `eventos_pendientes`, `padron_cache` y `descartes_locales` en `src/lib/offline/db.ts`
- [X] T005 [P] Servicio de cola con alta, listado y conteo en `src/lib/offline/queue.ts`
- [X] T006 [P] Migración de `eventos_descartados` en `supabase/migrations/20261117060100_eventos_descartados.sql`
- [X] T007 Endpoint `POST /api/sync/batch` con límite de 200 eventos en `app/api/sync/batch/route.ts`
- [X] T008 [P] Validación zod del lote y del evento en `src/features/sync/schema.ts`
- [X] T009 [P] Contrato de resultado por evento (`aplicado`, `duplicado`, `descartado`, `invalido`) en `src/features/sync/types.ts`
- [X] T010 Adaptador que valida el lote y llama a `registrar_asistencia_puerta` o `registrar_asistencia_curso` (no implementa una segunda función de aplicación)

**Checkpoint**: cola local y endpoint disponibles.

---

## Phase 3: US1 — Registrar sin conexión (P1) 🎯 MVP

**Goal**: escanear sin red con confirmación inmediata.

**Independent Test**: 200 eventos sin conexión sobreviven a recarga y se envían después.

### Tests

- [ ] T011 [P] [US1] Unitarias de alta en cola y persistencia en `tests/unit/offline/queue.test.ts`
- [ ] T012 [P] [US1] E2E con `context.setOffline(true)` en `tests/e2e/offline.spec.ts`

### Implementación

- [X] T013 [US1] Escribir siempre en la cola antes de llamar al servidor en `src/lib/offline/registrar.ts`
- [X] T014 [US1] Estado preliminar local con `src/lib/rules/estado.ts`
- [X] T015 [US1] Hidratación de la cola al iniciar la aplicación
- [X] T016 [US1] Precarga de `padron_cache` al iniciar sesión con TTL de 24 h
- [ ] T017 [US1] Manejo de almacenamiento lleno con aviso y sin descartes

**Checkpoint**: registro offline confiable.

---

## Phase 4: US2 — Sincronizar en lote (P1)

**Goal**: vaciar la cola al volver la red, sin duplicados.

**Independent Test**: 1,000 eventos offline → servidor recibe 1,000 exactos.

### Tests

- [ ] T018 [P] [US2] Integración de lote con duplicados en `tests/integration/sync-lote.test.ts`
- [ ] T019 [P] [US2] pgTAP de idempotencia por `evento_id` en `tests/rls/sync.test.sql`

### Implementación

- [X] T020 [US2] Sincronizador con lotes de 200 en `src/lib/offline/sync.ts`
- [ ] T021 [US2] Backoff exponencial (1 s, 5 s, 30 s, 5 min) y reintento manual
- [X] T022 [US2] Disparo al evento `online` y periódico mientras la app está abierta
- [X] T023 [US2] Eliminar de la cola sólo los resultados `aplicado` y `duplicado`
- [ ] T024 [US2] Marcar `requiere_revision` si la hora del dispositivo difiere más de 5 minutos
- [ ] T025 [US2] Advertencia al cerrar sesión con pendientes y borrado sólo tras confirmar
- [ ] T026 [US2] Registro de `descartes_locales` para mostrar al operador

**Checkpoint**: cero pérdidas y cero duplicados.

---

## Phase 5: US3 — Conflictos entre dispositivos (P2)

**Goal**: conservar un evento y registrar el descarte.

**Independent Test**: dos dispositivos, mismo alumno y contexto → uno aplicado, uno descartado.

### Tests

- [ ] T027 [P] [US3] Integración de conflicto entre dispositivos en `tests/integration/sync-conflicto.test.ts`

### Implementación

- [X] T028 [US3] Aplicar `evaluar_debounce` en el servidor antes de insertar
- [X] T029 [US3] Guardar el descarte con motivo y dispositivo en `eventos_descartados`
- [X] T030 [US3] Garantizar que puerta y aula no se descarten entre sí
- [ ] T031 [US3] Test de dos contextos distintos con el mismo alumno

**Checkpoint**: conflictos explicables.

---

## Phase 6: US4 — Indicador de estado (P2)

**Goal**: verde "En línea (Sincronizado)" o ámbar "Modo Offline (Registros en cola)".

**Independent Test**: desconectar y ver el cambio en menos de 2 segundos.

### Tests

- [ ] T032 [P] [US4] Unitarias del estado del indicador en `tests/unit/offline/indicador.test.ts`
- [ ] T033 [P] [US4] E2E de cambio de color y contador en `tests/e2e/indicador.spec.ts`

### Implementación

- [X] T034 [US4] Hook `useSyncStatus` que combina `navigator.onLine` y el conteo de la cola
- [X] T035 [US4] Componente en la barra superior con contador y tooltip
- [X] T036 [US4] Cambio en menos de 2 segundos y respeto de la preferencia de movimiento reducido
- [X] T037 [US4] Mostrar último error de sincronización al pasar el cursor

**Checkpoint**: operador informado del estado.

---

## Phase 7: Polish

- [ ] T038 [P] Prueba de carga de 1,000 eventos y verificación de conteos
- [ ] T039 [P] Prueba de corte de red a mitad de lote
- [ ] T040 Ejecutar `specs/008-offline-sincronizacion/quickstart.md`
- [ ] T041 Revisar que ningún dato local quede tras cerrar sesión de forma segura
- [X] T042 Revisar que el lote no exceda 200 eventos ni el tiempo de respuesta
- [X] T043 Manejar el resultado `reconciliado` como evento aplicado y probarlo en `tests/integration/sync-reconciliacion.test.ts`
- [ ] T044 Migrar `revisiones` y la bandeja del Administrador en `supabase/migrations/20261117060200_revisiones.sql` y `app/(admin)/admin/revisiones/page.tsx`
- [ ] T045 Implementar aceptar y anular evento con auditoría en `src/features/revisiones/actions.ts`
- [X] T046 Mostrar el último error de sincronización en el indicador (FR-008)
- [ ] T047 [P] Leer el umbral de desfase desde `configuracion` en `src/lib/offline/sync.ts`

---

## Dependencies & Execution Order

- Setup (T001–T003) → Foundational (T004–T010).
- US1 (T011–T017) es el MVP y habilita 004 y 005 en campo.
- US2 (T018–T026) depende de US1.
- US3 (T027–T031) depende de US2 y de `evaluar_debounce` (004).
- US4 (T032–T037) depende de US1 para tener cola real.
- Polish al final.

## Notes

- El servidor es la única autoridad sobre descartes.
- La cola nunca se borra por error de red.
- No se usa Background Sync como único mecanismo por soporte irregular.

## Estado de la implementación

- **26 de 47 tareas completadas.**
- `npm test`: 76 pruebas en 16 archivos, todas en verde.
- `npm run typecheck` y `npm run build`: sin errores.
- SQL para Supabase: `supabase/offline_cloud.sql`.
- **Pendientes:**
  - **T002**: service worker y manifiesto PWA completos.
  - **T011, T032**: pruebas de la cola y del indicador con IndexedDB simulado.
  - **T012, T033**: E2E de modo offline.
  - **T017**: aviso de almacenamiento lleno.
  - **T018, T019, T027, T031**: pruebas de lote, idempotencia y conflictos.
  - **T021**: backoff exponencial (hoy reintenta cada 30 s y al volver la red).
  - **T024**: creación automática de revisiones por desfase de reloj.
  - **T025, T041**: advertencia al cerrar sesión y borrado seguro de datos locales.
  - **T026**: registro local de descartes para mostrarlos al operador.
  - **T038, T039, T040**: pruebas de carga, corte de red y quickstart.
  - **T044, T045**: bandeja de revisión para el Administrador.
  - **T047**: umbral de desfase leído desde `configuracion`.
