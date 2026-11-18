# Data Model: Gestión académica

**Feature**: 002-gestion-academica | **Date**: 2026-11-17

Detalle de las tablas del módulo. El esquema completo y las relaciones están en
[001/data-model.md](../001-asistencia-qr-escolar/data-model.md).

## `usuarios`

| Campo | Tipo | Restricción |
|---|---|---|
| `id` | uuid | PK |
| `auth_user_id` | uuid | unique, FK `auth.users(id)` |
| `nombre` | text | not null |
| `username` | citext | unique, not null, 3–40 caracteres |
| `rol` | rol_usuario | not null, default `docente` |
| `activo` | boolean | not null, default true |
| `created_at`, `updated_at` | timestamptz | default now() |

Reglas: no se puede desactivar al último Administrador activo. El username no cambia después del
alta (se crea de nuevo si hace falta).

## `turnos`

| Campo | Tipo | Restricción |
|---|---|---|
| `nombre` | text | unique (`mañana`, `tarde`) |
| `hora_cierre` | time | not null |

## `grados`

| Campo | Tipo | Restricción |
|---|---|---|
| `nombre` | text | unique, not null |
| `turno_id` | uuid | FK turnos, not null |
| `hora_entrada` | time | not null |
| `tolerancia_min` | int | not null, default 10, entre 0 y 120 |
| `activo` | boolean | default true |

## `secciones`

| Campo | Tipo | Restricción |
|---|---|---|
| `grado_id` | uuid | FK grados |
| `nombre` | text | unique(`grado_id`, `nombre`) |
| `activo` | boolean | default true |

## `cursos`

| Campo | Tipo | Restricción |
|---|---|---|
| `seccion_id` | uuid | FK secciones |
| `docente_id` | uuid | FK usuarios con rol docente (validado por trigger) |
| `nombre` | text | not null |
| `hora_inicio` | time | not null |
| `duracion_bloque_min` | int | default 45, entre 20 y 180 |
| `tolerancia_min` | int | default 5, entre 0 y 60 |
| `activo` | boolean | default true |

## `auditoria`

| Campo | Tipo | Restricción |
|---|---|---|
| `id` | uuid | PK |
| `usuario_id` | uuid | FK usuarios |
| `accion` | text | insert, update, deactivate, reactivate |
| `entidad` | text | nombre de tabla |
| `entidad_id` | uuid | |
| `valor_anterior` | jsonb | |
| `valor_nuevo` | jsonb | |
| `fecha` | timestamptz | default now() |

Índice por (`entidad`, `entidad_id`, `fecha desc`) y por (`usuario_id`, `fecha desc`).

## `configuracion`

| Campo | Tipo | Restricción |
|---|---|---|
| `clave` | text | PK |
| `valor` | jsonb | not null |
| `descripcion` | text | |

Claves iniciales: `debounce_puerta_min` (5), `desfase_reloj_min` (5), `duracion_bloque_min` (45),
`retencion_dias` (365). Sólo el Administrador las edita; toda edición queda en auditoría.

## Funciones

| Función | Firma | Uso |
|---|---|---|
| `cursos_solapados` | `(p_docente uuid) returns setof cursos` | Detecta choques de horario. |
| `crear_usuario` | `(p_nombre, p_username, p_rol, p_password) returns uuid` | Crea Auth + perfil en una transacción. |

## Validaciones de negocio

- Grado sin turno no se puede activar.
- Sección sin grado activo no se puede crear.
- Curso sin sección activa no se puede crear.
- Un curso sólo se asigna a un usuario con rol `docente` y activo.
- Desactivar grados o secciones con alumnos activos exige confirmación y no borra datos.
- No se puede desactivar al último Administrador activo.
- `duracion_bloque_min` y `hora_inicio` deben caber dentro del turno del grado.
