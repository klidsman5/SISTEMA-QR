# Data Model: Offline y sincronización

**Feature**: 008-offline-sincronizacion | **Date**: 2026-11-17

## Local (IndexedDB / Dexie)

### `eventos_pendientes`

| Campo | Tipo | Regla |
|---|---|---|
| `evento_id` | string (uuid) | clave primaria, generada en el dispositivo |
| `tipo` | string | `puerta` o `aula` |
| `payload` | object | datos del registro (QR, sesión, origen) |
| `hora_dispositivo` | string ISO | obligatoria |
| `creado_en` | string ISO | |
| `estado` | string | pendiente, enviando, fallido |
| `intentos` | number | default 0 |
| `ultimo_error` | string | |

Índice: `estado`, `creado_en`.

### `padron_cache`

| Campo | Tipo | Regla |
|---|---|---|
| `qr_uuid` | string | clave primaria |
| `alumno_id` | string | |
| `nombre` | string | |
| `grado` | string | |
| `seccion` | string | |
| `credencial_vigente` | boolean | |
| `actualizado_en` | string ISO | TTL 24 h |

### `descartes_locales`

`evento_id`, `motivo`, `fecha`, para mostrar al operador por qué no se registró un evento.

## Servidor

### `eventos_descartados`

| Campo | Tipo | Regla |
|---|---|---|
| `evento_id` | uuid | unique |
| `contexto` | text | puerta o `curso:<id>` |
| `alumno_id` | uuid | FK alumnos |
| `motivo` | text | debounce, credencial_invalida, fuera_de_seccion, sesion_cerrada |
| `ocurrido_en` | timestamptz | |
| `recibido_en` | timestamptz | default now() |
| `dispositivo_id` | text | |

### `revisiones`

| Campo | Tipo | Regla |
|---|---|---|
| `evento_id` | uuid | unique |
| `asistencia_id` | uuid | fila afectada |
| `nivel` | text | puerta o aula |
| `motivo` | text | desfase_reloj |
| `estado` | text | pendiente, aceptada, anulada |
| `resuelto_por` | uuid | FK usuarios |
| `resuelto_en` | timestamptz | |

La bandeja de revisión sólo la ve el Administrador. Aceptar deja la asistencia como está; anular
restaura el estado anterior y escribe auditoría.

## Contrato de sincronización

Solicitud (máx. 200 eventos):

```json
{
  "dispositivo_id": "uuid-local",
  "eventos": [
    { "evento_id": "uuid", "tipo": "puerta",
      "hora_dispositivo": "2026-11-17T12:31:05.000Z",
      "payload": { "qr_uuid": "uuid", "origen": "escaneo" } }
  ]
}
```

Resultado por evento: `aplicado`, `reconciliado`, `duplicado`, `descartado` (con motivo) o
`invalido` (con detalle).

## Reglas

- Cada evento se intenta una vez por lote; un fallo de red no cambia el estado del evento.
- `duplicado` y `descartado` se eliminan de la cola; `invalido` requiere revisión del Administrador.
- La hora del dispositivo nunca se sobrescribe; el servidor añade `recibido_en`.
- Si `|recibido_en - hora_dispositivo| > 5 min`, el evento se guarda con `requiere_revision = true`.
