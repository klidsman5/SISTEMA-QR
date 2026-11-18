# Quickstart: validación de justificaciones

**Feature**: 006-justificaciones

## Prerrequisitos

- Una falta de 3ro B en Matemática y una tardanza de puerta.
- Sesiones como `admin` y `docente1`.

## Escenarios

| # | Acción | Resultado esperado |
|---|---|---|
| 1 | Justificar la falta como `docente1` | Estado justificado; aprobador y fecha visibles. |
| 2 | Justificar sin motivo | Rechazo con mensaje claro. |
| 3 | Justificar una falta de otro curso | Rechazo. |
| 4 | Registrar permiso previo para mañana | Queda vigente. |
| 5 | Ejecutar el cierre de mañana sin entrada del alumno | Queda justificado, no falta. |
| 6 | Alumno con permiso que sí registra entrada | La entrada prevalece. |
| 7 | Revertir la justificación | Vuelve a falta; el historial muestra ambos movimientos. |
| 8 | Consultar historial por alumno | Muestra quién, cuándo y motivo de cada cambio. |
| 9 | Justificar dos veces la misma falta | Se evita el duplicado. |

## Verificación técnica

```bash
pnpm test -- justificaciones
pnpm test:e2e -- justificaciones
supabase test db -- justificaciones
```

Criterios: [spec.md](./spec.md#success-criteria-mandatory).
