# Implementation Plan: Offline-First y sincronización

**Branch**: `008-offline-sincronizacion` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Módulo 7 de la spec padre 001.

## Summary

Cola local en IndexedDB con Dexie, registro inmediato sin red y sincronización por lotes idempotente
contra Supabase. Incluye el caché del padrón, el indicador de conexión y la resolución de conflictos.

## Technical Context

**Framework**: Next.js 15 + PWA. **Local**: Dexie 4 / IndexedDB. **Sync**: `POST /api/sync/batch`.
**Testing**: Vitest (cola y reintentos), Playwright (offline real), pgTAP (idempotencia).
**Performance**: <1 s de confirmación local; lote de 200 por petición; 1,000 eventos sin pérdida.
**Constraints**: sin pérdida de eventos; idempotencia; sin duplicados; funciona un día completo.

## Constitution Check

| Principio | Cumplimiento |
|---|---|
| III | Evento local con UUID propio y `unique` en el servidor; lote con reintentos. |
| V | Eventos descartados se conservan con motivo para auditoría. |
| I | El caché local sólo contiene lo mínimo para reconocer credenciales. |

Pasa sin excepciones.

## Design

- **Cola**: tabla Dexie `eventos_pendientes` (`evento_id` como clave). Estados `pendiente`,
  `enviando`, `fallido` con `intentos` y `ultimo_error`.
- **Registro**: la UI escribe primero en la cola y luego intenta sincronizar. La respuesta local usa
  `reglas/estado.ts` para mostrar un estado preliminar.
- **Sincronización**: lotes de 200; `fetch` a `/api/sync/batch`; por cada resultado `aplicado` o
  `duplicado` se elimina la fila local; `descartado` se elimina y se guarda en un log local; `invalido`
  queda con error para revisión.
- **Reintentos**: backoff exponencial (1 s, 5 s, 30 s, 5 min) y botón manual. Al volver `online` se
  dispara de inmediato.
- **Caché de padrón**: tabla Dexie `padron_cache` con TTL de 24 h y refresco al iniciar sesión.
- **Indicador**: componente que combina `navigator.onLine` con el conteo de pendientes; verde
  esmeralda si todo está sincronizado, ámbar si hay cola o no hay red.
- **Autoridad**: el servidor decide descartes por debounce y devuelve el resultado por evento. La
  aplicación del evento pertenece a las funciones de 004 y 005; este módulo nunca reimplementa esa
  lógica (Principio III).

## Phase 0 – Research

- **Decisión**: envío por lotes de 200. Motivo: buen equilibrio entre latencia y carga; medido contra
  eventos individuales.
- **Decisión**: evento local generado con `crypto.randomUUID()`; no hay secuencias locales.
- **Decisión**: no usar Background Sync del navegador como único mecanismo (soporte irregular);
  sincronización al volver `online` y periódica mientras la app está abierta.
- **Decisión**: los eventos con desfase de reloj no se descartan; pasan a una bandeja de revisión que
  resuelve el Administrador.

## Phase 1 – Artifacts

- [data-model.md](./data-model.md).
- Contratos: [http-api.md](../001-asistencia-qr-escolar/contracts/http-api.md) (Sincronización) y
  [rls.md](../001-asistencia-qr-escolar/contracts/rls.md).
- [quickstart.md](./quickstart.md).

## Implementation Phases

1. Esquema Dexie y servicio de cola.
2. Endpoint de sincronización y contrato por evento.
3. Reintentos, backoff y sincronización manual.
4. Caché de padrón y TTL.
5. Indicador de conexión y advertencias de cierre de sesión.
6. Pruebas de 1,000 eventos y conflictos.

## Testing

- Unitarias: cola, reintentos, backoff, marcado de revisión por reloj.
- Integración: lote con duplicados y descartes.
- E2E: offline real con Playwright (`context.setOffline`).
- Carga: 1,000 eventos y verificación de conteos.

## Dependencies and Risks

- Es dependencia de 004 y 005; debe implementarse antes o en paralelo.
- Riesgo: almacenamiento lleno en tablets antiguas. Mitigación: aviso temprano y límite configurable.
