# Data Model: Padrón y credenciales

**Feature**: 003-padron-y-credenciales | **Date**: 2026-11-17

## `alumnos`

| Campo | Tipo | Restricción |
|---|---|---|
| `id` | uuid | PK |
| `dni` | citext | unique, not null, 5–20 caracteres |
| `nombres` | text | not null |
| `apellidos` | text | not null |
| `grado_id` | uuid | FK grados, not null |
| `seccion_id` | uuid | FK secciones, not null |
| `anio_escolar` | int | not null |
| `estado` | estado_alumno | default `activo` |
| `foto_url` | text | opcional; sólo se muestra en el carnet |

Índices: `(seccion_id, apellidos)`, `(anio_escolar, estado)`.

## `matriculas`

| Campo | Tipo | Restricción |
|---|---|---|
| `alumno_id` | uuid | FK alumnos |
| `anio_escolar` | int | not null |
| `grado_id` | uuid | FK grados |
| `seccion_id` | uuid | FK secciones |

Unique(`alumno_id`, `anio_escolar`). Conserva el grado y la sección de cada año; los registros de
asistencia referencian `matricula_id` cuando se necesita el contexto histórico.

## `credenciales`

| Campo | Tipo | Restricción |
|---|---|---|
| `alumno_id` | uuid | FK alumnos |
| `qr_uuid` | uuid | unique, default `gen_random_uuid()` |
| `anio_escolar` | int | not null |
| `estado` | estado_credencial | default `vigente` |
| `emitida_en` | timestamptz | default now() |
| `revocada_en` | timestamptz | |
| `motivo_revocacion` | text | |

Índice parcial único `(alumno_id) where estado = 'vigente'`.

## `importaciones`

| Campo | Tipo | Restricción |
|---|---|---|
| `usuario_id` | uuid | FK usuarios |
| `archivo` | text | nombre original |
| `total_filas` | int | |
| `filas_validas` | int | |
| `filas_error` | int | |
| `detalle` | jsonb | errores por fila |
| `estado` | text | preview, confirmada, fallida |

## Reglas de validación

- Todos los campos de la fila son obligatorios: DNI, nombres, apellidos, grado, sección.
- El grado y la sección deben existir y estar activos.
- DNI duplicado dentro del archivo → error de fila; contra la base → conflicto que el Administrador
  debe resolver antes de confirmar.
- Al revocar, se exige motivo.
- Al dar de baja, se revocan todas las credenciales vigentes.
- El ciclo anual no borra filas: actualiza `matriculas` y marca `de_baja` a los ausentes.

## Transiciones

- Credencial: `vigente → revocada` (irreversible).
- Alumno: `activo → de_baja`.
- Importación: `preview → confirmada` o `preview → fallida` (expira a los 30 minutos).
