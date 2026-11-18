# Implementation Plan: Asistencia de puerta

**Branch**: `004-asistencia-puerta` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Módulo 3 de la spec padre 001.

## Summary

Pantalla de escaneo de alto contraste para registrar entradas, con respuesta inmediata incluso sin
red, regla de debounce y cierre de jornada idempotente por turno.

## Technical Context

**Framework**: Next.js 15 + PWA. **Scanner**: `@zxing/browser`.
**Storage**: `asistencias_puerta` en Postgres; cola Dexie en el dispositivo.
**Testing**: Vitest (reglas de estado), Playwright (offline), pgTAP (debounce y cierre).
**Performance**: <1 s local, <2 s con red, 1,000 entradas/15 min.
**Constraints**: sólo entradas; una por alumno y día; sin notificaciones.

## Constitution Check

| Principio | Cumplimiento |
|---|---|
| II | Contexto `puerta` independiente del aula en el debounce. |
| III | Evento local con `evento_id`; sincronización idempotente. |
| V | Cierre idempotente y sin reescritura de registros. |

Pasa sin excepciones.

## Design

- **Flujo**: seleccionar/confirmar turno → escanear → tarjeta de resultado → siguiente alumno. La
  tarjeta persiste 3 s configurable.
- **Resolución local**: el QR se busca en `padron_cache`; si no hay red, se calcula un estado
  preliminar y el servidor lo confirma al sincronizar.
- **Estado**: `registrar_asistencia_puerta(evento)` calcula con el horario vigente y congela la
  regla. El cliente muestra el estado devuelto o el preliminar.
- **Debounce**: 5 min por contexto `puerta`; una entrada por día vía `unique(alumno_id, fecha)`.
- **Cierre**: botón y pg_cron por turno; `precheck` muestra pendientes de sincronizar y alumnos sin
  entrada antes de ejecutar.
- **UI**: marco con esquinas y línea animada, destello y tarjeta verde/ámbar/roja con contraste 7:1;
  respeta "reducir movimiento".

## Phase 0 – Research

- **Decisión**: estado preliminar offline con confirmación posterior. Motivo: no bloquear la fila.
  Alternativa descartada: exigir red para calcular el estado.
- **Decisión**: cierre en SQL por turno. Detalle en 001/research.md D9.

## Phase 1 – Artifacts

- [data-model.md](./data-model.md).
- Contratos: [http-api.md](../001-asistencia-qr-escolar/contracts/http-api.md) (Puerta y Sincronización)
  y [rls.md](../001-asistencia-qr-escolar/contracts/rls.md).
- [quickstart.md](./quickstart.md).

## Implementation Phases

1. Migración de `asistencias_puerta` y `cierres_jornada`; función de registro.
2. Pantalla de escaneo y tarjeta de resultado.
3. Cola local y confirmación preliminar.
4. Consulta del día y registro manual.
5. Cierre de jornada y precheck.
6. Pruebas de carga y offline.

## Testing

- Unitarias: cálculo de estado en los límites de tolerancia.
- pgTAP: debounce, una entrada diaria, cierre idempotente.
- E2E: escanear con y sin red; cierre dos veces.

## Dependencies and Risks

- Depende de 002 (horarios), 003 (credenciales) y 008 (cola).
- Riesgo: reloj desfasado en el dispositivo. Mitigación: `requiere_revision` y hora del servidor.
