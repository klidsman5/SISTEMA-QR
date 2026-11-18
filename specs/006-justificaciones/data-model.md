# Data Model: Justificaciones

**Feature**: 006-justificaciones | **Date**: 2026-11-17

## `justificaciones`

| Campo | Tipo | Restricción |
|---|---|---|
| `id` | uuid | PK |
| `alumno_id` | uuid | FK alumnos |
| `tipo` | tipo_justificacion | previo, posterior |
| `nivel` | text | puerta, aula, ambos |
| `referencia_asistencia_id` | uuid | nullable; FK lógica a puerta o aula |
| `fecha` | date | not null |
| `motivo` | text | not null, 3–200 caracteres |
| `observacion` | text | not null, 3–500 caracteres |
| `aprobado_por` | uuid | FK usuarios |
| `aprobado_en` | timestamptz | default now() |
| `estado` | estado_justificacion | vigente, revertida |

Índice: `(alumno_id, fecha)`, `(referencia_asistencia_id)`.

Restricción de unicidad: una justificación vigente por (`alumno_id`, `fecha`, `referencia_asistencia_id`,
`nivel`).

## `justificaciones_historial`

| Campo | Tipo | Restricción |
|---|---|---|
| `id` | uuid | PK |
| `justificacion_id` | uuid | FK justificaciones |
| `usuario_id` | uuid | FK usuarios |
| `fecha` | timestamptz | default now() |
| `accion` | text | crear, revertir |
| `valor_anterior` | jsonb | |
| `valor_nuevo` | jsonb | |

## Reglas

- Motivo y observación obligatorios; no se aceptan vacíos ni sólo espacios.
- `tipo = previo` exige `fecha >= hoy`; si es anterior, se guarda como `posterior`.
- `tipo = posterior` exige un registro existente en esa fecha.
- Un Docente sólo justifica registros de cursos con `docente_id = auth.uid()`.
- Revertir exige motivo y restaura el estado previo guardado en `valor_anterior`.
- Al aplicar una justificación sobre una falta generada por cierre, el registro conserva
  `origen = 'cierre'` y cambia sólo el estado.

## Transiciones

- Justificación: `vigente → revertida`.
- Asistencia afectada: `falta | tardanza → justificado`; al revertir, vuelve al estado anterior.
