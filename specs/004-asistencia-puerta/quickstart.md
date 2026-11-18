# Quickstart: validación de asistencia de puerta

**Feature**: 004-asistencia-puerta

## Prerrequisitos

- Padrón cargado (003) y horario de 3ro configurado (002) con entrada 07:30 y tolerancia 10 min.
- Dispositivo con cámara o lector; sesión como `puerta1`.

## Escenarios

| # | Acción | Resultado esperado |
|---|---|---|
| 1 | Escanear a las 07:35 | Entrada puntual con nombre, grado, sección y hora. |
| 2 | Escanear a las 07:45 | Tardanza. |
| 3 | Repetir el mismo escaneo a los 2 min | Aviso de duplicado; sin nuevo registro. |
| 4 | Escanear una credencial revocada | Error claro; sin registro. |
| 5 | Registrar manualmente a un alumno sin credencial | Pide motivo y guarda el registro manual. |
| 6 | Desconectar la red y escanear 20 alumnos | Confirmación inmediata; contador de pendientes sube. |
| 7 | Reconectar | Cola llega a cero; no hay duplicados. |
| 8 | Ejecutar el cierre con 20 alumnos sin entrada | 20 faltas; los justificados no se marcan. |
| 9 | Ejecutar el cierre de nuevo | Sin faltas nuevas. |
| 10 | Intentar cerrar con dispositivos pendientes | Advertencia previa. |

## Verificación técnica

```bash
pnpm test -- puerta
pnpm test:e2e -- puerta-offline
supabase test db -- cierre
```

Criterios: [spec.md](./spec.md#success-criteria-mandatory).
