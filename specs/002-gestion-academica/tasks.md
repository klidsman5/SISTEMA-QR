---
description: "Task list for gestión académica y cuentas"
---

# Tasks: Gestión académica y cuentas

**Input**: Design documents from `specs/002-gestion-academica/`

**Prerequisites**: plan.md ✅, spec.md ✅, data-model.md ✅, contratos en `specs/001-asistencia-qr-escolar/contracts/` ✅

**Tests**: incluidos porque la constitución exige pruebas de RBAC y el plan de calidad las hace obligatorias para permisos y auditoría.

**Organización**: por historia de usuario, para implementar y probar cada una por separado.

## Format: `[ID] [P?] [Story] Descripción`

- **[P]**: puede ejecutarse en paralelo (archivos distintos, sin dependencias).
- **[Story]**: US1 cuentas, US2 estructura, US3 turnos/horarios, US4 auditoría y configuración.

## Phase 1: Setup (infraestructura compartida)

- [X] T001 Verificar que el proyecto Next.js + Supabase del plan 001 está inicializado (`package.json`, `app/`, `src/`, `supabase/`)
- [X] T002 [P] Instalar dependencias del módulo: `zod`, `date-fns-tz`, `@supabase/ssr` en `package.json`
- [X] T003 [P] Configurar scripts de lint, typecheck y test en `package.json`
- [X] T004 [P] Crear layout del área administrativa en `app/(admin)/layout.tsx` con la cabecera degradada y el acento índigo del rol

---

## Phase 2: Foundational (bloquea todas las historias)

**⚠️ CRÍTICO**: ninguna historia se implementa hasta terminar esta fase.

- [X] T005 Crear migración del esquema académico en `supabase/migrations/20261117000100_academico_schema.sql` (enums, `usuarios`, `turnos`, `grados`, `secciones`, `cursos`, `auditoria`)
- [X] T006 [P] Añadir índices y restricciones de unicidad de `specs/002-gestion-academica/data-model.md`
- [X] T007 [P] Implementar función `public.rol_actual()` y `public.es_administrador()` en `supabase/migrations/20261117000110_rls_helpers.sql`
- [X] T008 Aplicar políticas RLS de `specs/001-asistencia-qr-escolar/contracts/rls.md` a las tablas del módulo
- [X] T009 [P] Crear cliente de Supabase para servidor y navegador en `src/lib/supabase/server.ts` y `src/lib/supabase/client.ts`
- [X] T010 Implementar login por usuario con correo sintético en `app/(auth)/login/page.tsx` y `app/api/auth/login/route.ts`
- [X] T011 [P] Implementar guard de rol en `src/lib/auth/require-role.ts` y usarlo en el layout administrativo
- [X] T012 [P] Crear componentes base: tabla, formulario, diálogo de confirmación y badge de rol en `src/components/`
- [X] T013 [P] Configurar el seed de turnos mañana y tarde en `supabase/seed.sql`

**Checkpoint**: base de datos, auth y layout listos.

---

## Phase 3: US1 — Crear y administrar cuentas (P1) 🎯 MVP

**Goal**: el Administrador gestiona las cuentas de Docentes y Auxiliares, incluido el restablecimiento de contraseña.

**Independent Test**: crear un Docente, iniciar sesión, restablecerle la contraseña, cambiar la clave temporal, desactivarlo y comprobar que ya no entra.

### Tests

- [X] T014 [P] [US1] pgTAP de RLS de `usuarios` en `tests/rls/usuarios.test.sql` (Docente no escribe, Administrador sí)
- [X] T015 [P] [US1] Unitarias de validación de alta de cuenta en `tests/unit/admin/usuarios-schema.test.ts`
- [X] T016 [P] [US1] Unitarias de la regla del último Administrador activo en `tests/unit/admin/ultimo-admin.test.ts`

### Implementación

- [X] T017 [P] [US1] Esquema zod de alta y edición en `src/features/admin/usuarios/schema.ts`
- [X] T018 [US1] Función SQL `crear_usuario` que crea Auth y perfil en una transacción en `supabase/migrations/20261117000200_crear_usuario.sql`
- [X] T019 [US1] Server actions de listar, crear, editar y desactivar en `src/features/admin/usuarios/actions.ts`
- [X] T020 [US1] Página de listado y formulario en `app/(admin)/admin/usuarios/page.tsx`
- [X] T021 [US1] Regla de no desactivar al último Administrador activo en `src/features/admin/usuarios/actions.ts`
- [X] T022 [US1] Restablecimiento de contraseña con clave temporal y cambio obligatorio en `app/api/admin/usuarios/[id]/reset-password/route.ts` y la ficha del usuario
- [X] T023 [US1] Mensajes de error en español para usuario duplicado y rol inválido

**Checkpoint**: US1 funciona y se prueba sola, incluido el reset de contraseña.

---

## Phase 4: US2 — Configurar grados, secciones y cursos (P1)

**Goal**: estructura académica completa con asignación de cursos a Docentes.

**Independent Test**: crear 3ro A/B, asignar Matemática de 3ro B a un Docente y verificar que sólo ve ese curso.

### Tests

- [X] T024 [P] [US2] pgTAP: un Docente no ve cursos ajenos en `tests/rls/cursos.test.sql`
- [X] T025 [P] [US2] Unitarias de validación de estructura en `tests/unit/admin/estructura-schema.test.ts`

### Implementación

- [X] T026 [P] [US2] Esquemas zod de grado, sección y curso en `src/features/admin/estructura/schema.ts`
- [X] T027 [US2] Server actions CRUD de grados y secciones en `src/features/admin/estructura/actions.ts`
- [X] T028 [US2] Server actions de cursos y asignación de Docente en `src/features/admin/cursos/actions.ts`
- [X] T029 [US2] Validación de que `docente_id` tenga rol docente y esté activo en `supabase/migrations/20261117000300_curso_docente_check.sql`
- [X] T030 [US2] Página de estructura en `app/(admin)/admin/estructura/page.tsx`
- [X] T031 [US2] Indicador de cursos sin Docente asignado
- [X] T032 [US2] Desactivación con confirmación que conserva historial

**Checkpoint**: US1 y US2 operativas.

---

## Phase 5: US3 — Configurar turnos y horarios (P1)

**Goal**: horario de entrada por grado y bloque completo por curso (inicio, duración y tolerancia).

**Independent Test**: entrada 07:30 + tolerancia 10 min; 07:35 puntual, 07:45 tardanza; curso 08:00 con 45 min ocupa hasta 08:45.

### Tests

- [X] T033 [P] [US3] Unitarias de límites de tolerancia en `tests/unit/rules/horario.test.ts`
- [X] T034 [P] [US3] Unitarias de solapamiento de cursos en `tests/unit/admin/solapamiento.test.ts`

### Implementación

- [X] T035 [US3] Función SQL `cursos_solapados(docente)` que usa inicio y duración en `supabase/migrations/20261117000400_solapamiento.sql`
- [X] T036 [US3] Server actions de turnos y horarios en `src/features/admin/horarios/actions.ts`
- [X] T037 [US3] Página de horarios con validación de rango en `app/(admin)/admin/horarios/page.tsx`
- [X] T038 [US3] Aviso de solapamiento al asignar cursos
- [X] T039 [US3] Helper `src/lib/rules/horario.ts` que expone horario vigente, tolerancia y fin de bloque
- [X] T040 [US3] Agregar `duracion_bloque_min` a `cursos` y al formulario en `supabase/migrations/20261117000600_duracion_bloque.sql` y `src/features/admin/horarios/schema.ts`
- [X] T041 [P] [US3] Probar SC-008: solapamiento detectado con la duración configurada en `tests/unit/admin/solapamiento-duracion.test.ts`

**Checkpoint**: los módulos 004 y 005 ya tienen de dónde leer horarios y bloques.

---

## Phase 6: US4 — Auditar acciones y configurar parámetros (P2)

**Goal**: consulta de auditoría y parámetros operativos sin desplegar.

**Independent Test**: cambiar un horario y un parámetro, y ver ambos en auditoría con valor anterior y nuevo.

### Tests

- [X] T042 [P] [US4] pgTAP del trigger de auditoría en `tests/rls/auditoria.test.sql`

### Implementación

- [X] T043 [US4] Trigger `trg_auditoria` en `supabase/migrations/20261117000500_auditoria.sql`
- [X] T044 [US4] Server action de consulta con filtros en `src/features/admin/auditoria/actions.ts`
- [X] T045 [US4] Página de auditoría en `app/(admin)/admin/auditoria/page.tsx`
- [ ] T046 [US4] Registro de la acción `deactivate` con el motivo
- [X] T047 [US4] Migrar la tabla `configuracion`, sus claves iniciales y la pantalla de parámetros en `supabase/migrations/20261117000700_configuracion.sql` y `app/(admin)/admin/configuracion/page.tsx`
- [X] T048 [US4] Exportación previa a la retención y job que sólo elimina tras confirmación del Administrador en `src/features/admin/retencion/actions.ts`

**Checkpoint**: todas las historias del módulo funcionan.

---

## Phase 7: Polish y validación

- [X] T049 [P] Pruebas E2E del flujo completo (cuenta, reset, estructura, horarios) en `tests/e2e/admin-academico.spec.ts`
- [X] T050 [P] Revisar que la UI no prometa notificaciones ni mensajes a familias
- [ ] T051 Verificar contraste WCAG AA en la tabla y los formularios
- [ ] T052 Ejecutar los escenarios de `specs/002-gestion-academica/quickstart.md`
- [X] T053 Revisar que las acciones administrativas no expongan datos de alumnos
- [X] T054 [P] Probar FR-014: un registro previo conserva su estado tras cambiar el horario en `tests/integration/horario-historico.test.ts`
- [X] T055 [P] Probar FR-011: desactivar un grado conserva alumnos y asistencia en `tests/integration/desactivar-historial.test.ts`

---

## Dependencies & Execution Order

### Fases

- **Setup (T001–T004)**: sin dependencias.
- **Foundational (T005–T013)**: depende del setup; bloquea las historias.
- **US1 (T014–T023)**: depende de Foundational.
- **US2 (T024–T032)**: depende de Foundational; puede ir en paralelo con US1.
- **US3 (T033–T041)**: depende de US2 (cursos existentes).
- **US4 (T042–T048)**: depende de US1 y US2.
- **Polish (T049–T055)**: al final.

### Dentro de cada historia

- Pruebas antes de la implementación (deben fallar primero).
- Esquema zod → server actions → página.
- Validar el checkpoint antes de pasar a la siguiente historia.

### Paralelización

- T002–T004, T006–T007, T009, T011–T013 pueden ir en paralelo dentro de su fase.
- T014–T016, T024–T025, T033–T034 y T042 pueden ejecutarse en paralelo entre sí al terminar cada fase.
- US1 y US2 pueden desarrollarse en paralelo por dos personas; US3 depende de US2.

---

## Implementation Strategy

### MVP

T001–T023: el Administrador crea cuentas, restablece contraseñas y entra con roles. Es la base de todo el sistema.

### Entrega incremental

1. Setup + Foundational.
2. US1 (cuentas y reset) → validar.
3. US2 (estructura) → validar.
4. US3 (horarios y duración) → habilita puerta y aula.
5. US4 (auditoría, configuración y retención) → cierre del módulo.

---

## Notes

- No hay tareas de notificaciones ni de apoderados: el módulo no las incluye.
- Las rutas de archivo siguen la estructura de `specs/001-asistencia-qr-escolar/plan.md`.
- Evitar tocar la misma migración en dos tareas: cada una tiene su archivo con marca de tiempo.
- La retención nunca elimina sin exportación y confirmación explícita.

## Estado de la implementación

- **52 de 55 tareas completadas.** Código en `app/`, `src/`, `supabase/migrations/` y `tests/`.
- `npm test`: 34 pruebas en 8 archivos, todas en verde.
- `npm run typecheck` y `npm run build`: sin errores.
- **Pendientes por entorno o alcance:**
  - **T046**: la auditoría registra la acción `deactivate` pero no un motivo escrito por el usuario.
  - **T051**: falta la verificación de contraste con una herramienta de accesibilidad; los tokens usados son los de la especificación.
  - **T052**: ejecutar el quickstart requiere Supabase CLI y Docker, que no están instalados en esta máquina.
- Las pruebas pgTAP (`tests/rls/`) y la E2E están escritas pero no ejecutadas por la misma razón.
