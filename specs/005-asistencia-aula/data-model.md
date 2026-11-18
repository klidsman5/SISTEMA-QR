# Data Model: Asistencia de aula

**Feature**: 005-asistencia-aula | **Date**: 2026-11-17

## `sesiones_clase`

| Campo | Tipo | Restricción |
|---|---|---|
| `id` | uuid | PK |
| `curso_id` | uuid | FK cursos |
| `docente_id` | uuid | FK usuarios (debe ser el docente del curso) |
| `fecha` | date | not null |
| `abierta_en` | timestamptz | not null |
| `cerrada_en` | timestamptz | |
| `estado` | estado_sesion | abierta, cerrada |
| `hora_inicio_aplicada` | time | not null |
| `tolerancia_aplicada` | int | not null |

Índice parcial único `(curso_id, fecha) where estado = 'abierta'`.

## `asistencias_curso`

| Campo | Tipo | Restricción |
|---|---|---|
| `id` | uuid | PK |
| `evento_id` | uuid | unique, not null |
| `sesion_id` | uuid | FK sesiones_clase |
| `alumno_id` | uuid | FK alumnos |
| `matricula_id` | uuid | FK matriculas |
| `fecha` | date | not null |
| `hora_dispositivo` | timestamptz | not null |
| `recibido_en` | timestamptz | default now() |
| `estado` | estado_asistencia | puntual, tardanza, justificado, falta |
| `origen` | origen_registro | escaneo, manual, cierre |
| `dispositivo_id` | text | |
| `registrado_por` | uuid | FK usuarios |
| `actualizada_en` | timestamptz | se llena al reconciliar una falta previa |

## Reconciliación

`unique(sesion_id, alumno_id)` se mantiene. Al registrar una credencial con una fila existente de
`origen = 'cierre'`, se actualiza esa fila (hora, estado, origen `escaneo`, `actualizada_en`) y se
audita el estado anterior. Una fila de escaneo previo no se sobrescribe: se aplica el debounce y se
devuelve `duplicado`.

Restricciones: `unique(sesion_id, alumno_id)`.

## Reglas del cierre de sesión

1. Sólo el Docente dueño del curso o el Administrador cierran.
2. Se marcan faltas a los alumnos activos de la sección sin registro en la sesión.
3. Si existe permiso previo vigente para la fecha, se marca `justificado`.
4. Repetir el cierre no duplica filas (unique por sesión y alumno) y no cambia estados ya definidos.

## Estados

- Sesión: `abierta → cerrada`.
- Asistencia: `puntual | tardanza → justificado`; `falta → justificado` si se justifica después.
- La falta se crea con `origen = 'cierre'` y `registrado_por` = docente que cerró.

## Validaciones

- El alumno debe pertenecer a la sección del curso al momento de la sesión (`matriculas`).
- La credencial debe estar vigente y pertenecer al alumno.
- No se registra en sesiones cerradas.
- Un alumno de otra sección se rechaza aunque la credencial sea válida.
