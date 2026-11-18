# Quickstart: validación offline y sincronización

**Feature**: 008-offline-sincronizacion

## Prerrequisitos

- Aplicación instalada como PWA o abierta tras una primera visita con red.
- Cuenta de Auxiliar o Docente y padrón sembrado.

## Escenarios

| # | Acción | Resultado esperado |
|---|---|---|
| 1 | Desconectar la red (DevTools → Offline) | Indicador pasa a "Modo Offline" en <2 s. |
| 2 | Registrar 20 escaneos | Confirmación inmediata; contador de pendientes = 20. |
| 3 | Recargar la app | Los 20 eventos siguen en cola. |
| 4 | Reconectar | Se sincronizan; contador = 0; indicador verde. |
| 5 | Forzar el reenvío de un evento ya aplicado | El servidor responde `duplicado`; no crea fila. |
| 6 | Registrar al mismo alumno desde dos dispositivos offline | Un evento aplicado y uno descartado por debounce. |
| 7 | Alterar el reloj del dispositivo +10 min | Al sincronizar, el evento queda `requiere_revision`. |
| 8 | Llenar el almacenamiento local simulado | Aviso; ningún evento pendiente se descarta. |
| 9 | Cerrar sesión con pendientes | Advertencia; no se borran sin confirmar. |
| 10 | Reintentar con el servidor caído | Los eventos permanecen y se reintentan con backoff. |

## Verificación técnica

```bash
pnpm test -- sync
pnpm test:e2e -- offline
supabase test db -- idempotencia
```

Carga: generar 1,000 eventos offline y verificar que el servidor recibe exactamente 1,000.
Criterios: [spec.md](./spec.md#success-criteria-mandatory).
