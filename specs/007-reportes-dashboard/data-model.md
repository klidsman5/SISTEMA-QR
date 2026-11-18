# Data Model: Reportes y dashboard

**Feature**: 007-reportes-dashboard | **Date**: 2026-11-17

No se crean tablas de hechos: se leen las de 004, 005 y 006 mediante vistas.

## `v_asistencia_detalle`

| Columna | Origen |
|---|---|
| `nivel` | `'puerta'` o `'aula'` |
| `fecha`, `hora` | registro original |
| `alumno_id`, `alumno`, `dni` | alumnos |
| `grado`, `seccion`, `turno` | `matriculas` unida por el `matricula_id` guardado en la asistencia (no la matrícula vigente) |
| `curso`, `docente` | sólo nivel aula |
| `estado` | estado de la asistencia |
| `aprobador`, `fecha_justificacion` | justificación vigente, si aplica |
| `origen` | escaneo, manual, cierre |

`union all` de `asistencias_puerta` y `asistencias_curso`, sin duplicar filas de justificación.

## `v_asistencia_diaria`

Agrupa `v_asistencia_detalle` por (`alumno_id`, `fecha`, `turno`, `nivel`):

- `estado_final`: justificado > falta > tardanza > puntual (prioridad de presentación).
- `tiene_entrada`: boolean.

## `v_metricas_mensuales`

Agrupa por (`anio`, `mes`, `grado`, `seccion`):

- `total_alumnos_dia`, `asistencias`, `puntuales`, `tardanzas`, `faltas`, `justificados`.
- `pct_asistencia`, `pct_puntualidad`, `pct_ausentismo`.

## `reportes_generados`

| Campo | Tipo | Restricción |
|---|---|---|
| `usuario_id` | uuid | FK usuarios |
| `fecha` | timestamptz | default now() |
| `rango_desde`, `rango_hasta` | date | |
| `filtros` | jsonb | validados con zod |
| `formato` | text | xlsx, pdf |
| `filas` | int | |
| `estado` | text | ok, error |

## Caché del dashboard

La clave de caché MUST incluir usuario, alcance, rango y filtros. Cambiar de mes MUST invalidar la
entrada correspondiente; el TTL de 60 s sólo aplica a la misma clave.

## Reglas de alcance

- Administrador: sin filtro adicional.
- Auxiliar: `nivel = 'puerta'` forzado.
- Docente: `docente_id = auth.uid()` forzado en nivel aula y sin nivel puerta.

## Índices necesarios

- `asistencias_puerta (fecha)`, `(alumno_id, fecha)`.
- `asistencias_curso (fecha)`, `(sesion_id)`.
- `justificaciones (alumno_id, fecha) where estado = 'vigente'`.
