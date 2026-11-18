# Contrato HTTP (route handlers de Next.js)

Base: `/api`. Todas las respuestas usan JSON `{ data, error }`. Los errores llevan `code` estable y
`message` en español. La autenticación es por cookie de sesión de Supabase. Ningún endpoint devuelve
datos fuera del alcance del rol.

## Autenticación

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/auth/login` | público | `{ username, password }` → sesión. |
| POST | `/auth/logout` | autenticado | Cierra sesión. |
| GET | `/auth/me` | autenticado | `{ id, nombre, rol }`. |

## Sincronización (008)

### POST `/sync/batch`

```json
{
  "dispositivo_id": "uuid-local",
  "eventos": [
    {
      "evento_id": "uuid-v4",
      "tipo": "puerta",
      "hora_dispositivo": "2026-11-17T12:31:05.000Z",
      "payload": {
        "qr_uuid": "uuid-de-credencial",
        "origen": "escaneo"
      }
    }
  ]
}
```

Respuesta `200`:

```json
{
  "data": {
    "resultados": [
      { "evento_id": "uuid-v4", "resultado": "aplicado", "estado": "tardanza" },
      { "evento_id": "uuid-v4-2", "resultado": "duplicado" },
      { "evento_id": "uuid-v4-3", "resultado": "descartado", "motivo": "debounce" }
    ]
  }
}
```

Reglas: máximo 200 eventos por lote; `evento_id` obligatorio; `hora_dispositivo` en ISO-8601 con
zona; evento repetido devuelve `duplicado` sin crear fila.

## Puerta (004)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/attendance/gate` | auxiliar, administrador | Registra una entrada (usado también por sync). |
| GET | `/attendance/gate/today` | auxiliar, administrador | Registros del día del turno. |
| POST | `/attendance/close-day` | administrador | Cierre manual `{ turno_id, fecha }`. |
| GET | `/attendance/close-day/precheck` | administrador | Eventos pendientes y alumnos sin entrada. |

## Aula (005)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/sesiones?fecha=` | docente | Sesiones y cursos del docente. |
| POST | `/sesiones` | docente | Abre sesión `{ curso_id }`. |
| POST | `/sesiones/{id}/cerrar` | docente | Cierra y genera faltas. |
| POST | `/attendance/class` | docente | Registro por credencial. |
| GET | `/sesiones/{id}/roster` | docente | Presentes y ausentes. |

## Administración (002, 003)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET/POST/PATCH | `/admin/usuarios` | administrador | Cuentas y roles. |
| GET/POST/PATCH | `/admin/grados`, `/admin/secciones`, `/admin/cursos` | administrador | Estructura. |
| PATCH | `/admin/horarios` | administrador | Turnos, entrada, tolerancias. |
| POST | `/admin/padron/import` | administrador | Carga CSV/XLSX; devuelve vista previa y errores. |
| POST | `/admin/padron/confirm` | administrador | Confirma la importación. |
| POST | `/admin/usuarios/{id}/reset-password` | administrador | Genera contraseña temporal y obliga a cambiarla en el siguiente ingreso. |
| POST | `/admin/credenciales/revocar` | administrador | Revoca y reemite. |
| GET | `/admin/credenciales/pdf?grado=&seccion=` | administrador | PDF de carnets. |

## Justificaciones (006)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| POST | `/justificaciones` | administrador, docente | Crea justificación o permiso. |
| POST | `/justificaciones/{id}/revertir` | administrador, docente | Revierte con motivo. |
| GET | `/justificaciones?alumno=&desde=&hasta=` | según rol | Consulta con historial. |

## Reportes y dashboard (007)

| Método | Ruta | Rol | Descripción |
|---|---|---|---|
| GET | `/reports/attendance?formato=xlsx\|pdf&...` | según rol | Descarga el reporte filtrado. |
| GET | `/dashboard/summary?desde=&hasta=` | administrador, docente | Métricas. |

Parámetros de filtro: `alumno`, `grado`, `seccion`, `curso`, `turno`, `nivel` (puerta|aula),
`estado` (puntual|tardanza|falta|justificado), `desde`, `hasta`.

## Códigos de error

| Código | HTTP | Significado |
|---|---|---|
| `NO_AUTENTICADO` | 401 | Sin sesión válida. |
| `SIN_PERMISO` | 403 | Rol fuera de alcance. |
| `VALIDACION` | 422 | Payload inválido (detalle por campo). |
| `CREDENCIAL_INVALIDA` | 409 | QR desconocido o revocado. |
| `FUERA_DE_SECCION` | 409 | Alumno no pertenece a la sección. |
| `SESION_CERRADA` | 409 | Registro en sesión cerrada. |
| `DUPLICADO` | 409 | Evento repetido o dentro del debounce. |
| `CONFLICTO_HORARIO` | 409 | Solapamiento de cursos del docente. |
| `SIN_CONEXION` | 503 | Operación que requiere red. |
