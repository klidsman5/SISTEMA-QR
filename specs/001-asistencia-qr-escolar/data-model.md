# Data Model: Esquema central

**Feature**: 001-asistencia-qr-escolar | **Date**: 2026-11-17

Convenciones: todas las tablas tienen `id uuid default gen_random_uuid()`, `created_at timestamptz`
y `updated_at timestamptz`. Las fechas de asistencia usan `date` en la zona del colegio y las horas
`timestamptz`.

## Enumeraciones

| Enum | Valores |
|---|---|
| `rol_usuario` | administrador, auxiliar_puerta, docente |
| `estado_alumno` | activo, de_baja |
| `estado_credencial` | vigente, revocada |
| `estado_asistencia` | puntual, tardanza, falta, justificado |
| `tipo_justificacion` | previo, posterior |
| `estado_justificacion` | vigente, revertida |
| `estado_sesion` | abierta, cerrada |
| `origen_registro` | escaneo, manual, cierre |
| `resultado_sync` | aplicado, duplicado, descartado, invalido |

## 002 — Estructura académica

### `usuarios`
Perfil ligado a `auth.users`.

| Campo | Tipo | Reglas |
|---|---|---|
| `auth_user_id` | uuid | unique, FK `auth.users` |
| `nombre` | text | obligatorio |
| `username` | citext | unique, obligatorio |
| `rol` | rol_usuario | obligatorio |
| `activo` | boolean | default true |

### `turnos`
`nombre` (mañana, tarde), `hora_cierre` (hora local, para pg_cron).

### `grados`
`nombre`, `turno_id` → turnos, `hora_entrada time`, `tolerancia_min int` (default 10), `activo`.

### `secciones`
`grado_id` → grados, `nombre` (A, B), unique(`grado_id`, `nombre`), `activo`.

### `cursos`
`seccion_id` → secciones, `docente_id` → usuarios, `nombre`, `hora_inicio time`,
`duracion_bloque_min int` (default 45), `tolerancia_min int` (default 5), `activo`. La duración del
bloque es la base para detectar solapamientos y para cerrar sesiones olvidadas.

### `configuracion`
Parámetros editables sin desplegar código.

| Campo | Tipo | Reglas |
|---|---|---|
| `clave` | text | PK (`debounce_puerta_min`, `desfase_reloj_min`, `duracion_bloque_min`, `dias_retention`) |
| `valor` | jsonb | validado por clave |
| `descripcion` | text | |

### `auditoria`
`usuario_id`, `accion`, `entidad`, `entidad_id`, `valor_anterior jsonb`, `valor_nuevo jsonb`,
`fecha timestamptz`.

## 003 — Padrón y credenciales

### `alumnos`
`dni citext` unique, `nombres`, `apellidos`, `grado_id`, `seccion_id`, `estado_alumno`,
`anio_escolar int`, `foto_url text` (opcional). El par (grado, sección) es el vigente; el histórico vive en `matriculas`.

### `matriculas`
`alumno_id`, `anio_escolar`, `grado_id`, `seccion_id`, unique(`alumno_id`, `anio_escolar`).
Permite conservar el grado y la sección de cada año.

### `credenciales`
`alumno_id`, `qr_uuid uuid` unique, `anio_escolar`, `estado_credencial`, `emitida_en`,
`revocada_en`, `motivo_revocacion`. Índice parcial único: una credencial vigente por alumno.

### `importaciones`
`archivo`, `usuario_id`, `total_filas`, `filas_validas`, `filas_error`, `detalle jsonb`, `estado`.

## 004 — Asistencia de puerta

### `asistencias_puerta`
| Campo | Tipo | Reglas |
|---|---|---|
| `evento_id` | uuid | unique, generado en el dispositivo (idempotencia) |
| `alumno_id` | uuid | FK alumnos |
| `fecha` | date | zona del colegio |
| `hora_dispositivo` | timestamptz | obligatorio |
| `recibido_en` | timestamptz | default now() |
| `estado` | estado_asistencia | puntual, tardanza, justificado (falta sólo en cierre) |
| `hora_entrada_aplicada` | time | regla congelada |
| `tolerancia_aplicada` | int | regla congelada |
| `origen` | origen_registro | escaneo o manual |
| `motivo_manual` | text | obligatorio si origen = manual |
| `dispositivo_id` | text | identificador del navegador |
| `registrado_por` | uuid | FK usuarios |
| `requiere_revision` | boolean | true si \|recibido_en - hora_dispositivo\| > 5 min |

Restricciones: `unique(alumno_id, fecha)` (una entrada por día); índice por fecha y turno.

### `cierres_jornada`
`turno_id`, `fecha`, `ejecutado_por` (null = sistema), `ejecutado_en`, `total_faltas`,
`total_exceptuados`, unique(`turno_id`, `fecha`).

## 005 — Asistencia de aula

### `sesiones_clase`
`curso_id`, `docente_id`, `fecha`, `abierta_en`, `cerrada_en`, `estado_sesion`,
`hora_inicio_aplicada`, `tolerancia_aplicada`, unique parcial: una sesión abierta por curso y fecha.

### `asistencias_curso`
`evento_id` unique, `sesion_id` → sesiones_clase, `alumno_id`, `fecha`,
`hora_dispositivo`, `recibido_en`, `estado`, `origen`, `dispositivo_id`, `registrado_por`.
Restricción: `unique(sesion_id, alumno_id)`. Una entrada posterior a una falta actualiza la fila
existente (ver "Reconciliación" en 004 y 005), no crea otra.

## 006 — Justificaciones

### `justificaciones`
`alumno_id`, `tipo`, `nivel` (puerta, aula, ambos), `referencia_asistencia_id uuid` (nullable),
`fecha date` (para permisos previos), `motivo text`, `observacion text`,
`aprobado_por uuid`, `aprobado_en`, `estado_justificacion`.

Reglas: motivo y observación no vacíos; una justificación vigente por alumno, fecha y referencia.

### `justificaciones_historial`
`justificacion_id`, `usuario_id`, `fecha`, `accion`, `valor_anterior jsonb`, `valor_nuevo jsonb`.

## 007 — Reportes

No crea tablas de dominio. Usa vistas:

- `v_asistencia_detalle`: unión de puerta y aula con `nivel`, estado, curso, docente y aprobador.
- `v_asistencia_diaria`: agregado por alumno, fecha, turno y nivel.
- `v_metricas_mensuales`: asistencia, puntualidad y ausentismo por grado y sección.

### `reportes_generados`
`usuario_id`, `fecha`, `rango_desde`, `rango_hasta`, `filtros jsonb`, `formato`, `filas`,
`estado` (ok, error).

## 008 — Offline (local, Dexie)

### `eventos_pendientes` (IndexedDB)
`evento_id` (clave), `tipo` (puerta, aula), `payload jsonb`, `hora_dispositivo`, `estado`
(pendiente, enviando, fallido), `intentos int`, `ultimo_error text`.

### `padron_cache` (IndexedDB)
`qr_uuid`, `alumno_id`, `nombre`, `grado`, `seccion`, `credencial_vigente`, `actualizado_en`.

## Relaciones

```text
turnos 1─N grados 1─N secciones 1─N cursos
usuarios 1─N cursos (docente)
alumnos N─1 secciones, N─1 grados, 1─N matriculas, 1─N credenciales
cursos 1─N sesiones_clase 1─N asistencias_curso N─1 alumnos
alumnos 1─N asistencias_puerta
alumnos 1─N justificaciones 1─N justificaciones_historial
```

## Transiciones de estado

- **Asistencia (puerta/aula)**: puntual → justificado; tardanza → justificado; falta → justificado;
  justificado → (registro anterior restaurado por reversión).
- **Credencial**: vigente → revocada (no vuelve).
- **Alumno**: activo → de_baja (no vuelve en el mismo año).
- **Sesión**: abierta → cerrada (no reabre).
- **Justificación**: vigente → revertida.
