# Data Model: Asistencia de puerta

**Feature**: 004-asistencia-puerta | **Date**: 2026-11-17

## `asistencias_puerta`

| Campo | Tipo | Restricción |
|---|---|---|
| `id` | uuid | PK |
| `evento_id` | uuid | unique, not null (idempotencia) |
| `alumno_id` | uuid | FK alumnos |
| `matricula_id` | uuid | FK matriculas (contexto histórico) |
| `fecha` | date | not null, zona del colegio |
| `hora_dispositivo` | timestamptz | not null |
| `recibido_en` | timestamptz | default now() |
| `estado` | estado_asistencia | puntual, tardanza, justificado |
| `hora_entrada_aplicada` | time | not null |
| `tolerancia_aplicada` | int | not null |
| `origen` | origen_registro | escaneo, manual |
| `motivo_manual` | text | requerido si manual |
| `dispositivo_id` | text | |
| `registrado_por` | uuid | FK usuarios |
| `requiere_revision` | boolean | default false |
| `actualizada_en` | timestamptz | se llena cuando la fila se reconcilia |

Restricciones:

- `unique(alumno_id, fecha)`.
- `origen = 'manual'` exige `motivo_manual` no vacío (check).
- `estado` sólo puede ser `puntual`, `tardanza` o `justificado`; `falta` se crea por el cierre.
- Índices: `(fecha, estado)`, `(registrado_por, fecha)`.

## `cierres_jornada`

| Campo | Tipo | Restricción |
|---|---|---|
| `turno_id` | uuid | FK turnos |
| `fecha` | date | |
| `ejecutado_por` | uuid | null si fue el sistema |
| `ejecutado_en` | timestamptz | default now() |
| `total_faltas` | int | |
| `total_exceptuados` | int | |

Unique(`turno_id`, `fecha`).

## Reconciliación de la entrada

`unique(alumno_id, fecha)` se mantiene, pero el registro se hace con `INSERT ... ON CONFLICT
(alumno_id, fecha) DO UPDATE` cuando la fila existente tiene `origen = 'permiso'` o `'cierre'`:

1. Actualizar `hora_dispositivo`, `recibido_en`, `estado`, `hora_entrada_aplicada`,
   `tolerancia_aplicada`, `origen = 'escaneo'` (o `'manual'`) y `actualizada_en`.
2. Guardar en auditoría el estado anterior y el motivo `reconciliacion_entrada`.
3. Si la fila existente es un escaneo previo, no se sobrescribe: se aplica la ventana de
   enfriamiento y se devuelve `duplicado`.

## Reglas del cierre (`cerrar_jornada`)

1. Verificar que no exista un cierre para (`turno`, `fecha`); si existe, devolver el resultado previo.
2. Para cada alumno activo del turno:
   - Si tiene permiso previo vigente para la fecha → `justificado`.
   - Si tiene entrada de puerta → no se toca.
   - Si no → insertar `falta` en `asistencias_puerta` con `origen = 'cierre'` y `evento_id`
     determinista (`uuid_v5(turno + fecha + alumno)`) para que un segundo cierre no duplique.
3. Registrar auditoría y totales.

> Nota de diseño: la falta se materializa como fila de `asistencias_puerta` con `origen = 'cierre'`
> para que reportes y justificaciones operen sobre una sola tabla. El enum `origen_registro` incluye
> el valor `cierre`.

## Estados

- Entrada escaneada: `puntual` o `tardanza`.
- Falta generada por cierre: `falta` → puede pasar a `justificado` (006).
- Permiso previo: nace `justificado`.
