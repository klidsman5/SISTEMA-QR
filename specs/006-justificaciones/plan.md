# Implementation Plan: Justificaciones y permisos

**Branch**: `006-justificaciones` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Módulo 5 de la spec padre 001.

## Summary

Formulario de justificaciones posteriores y permisos previos que cambian el estado de una falta o
tardanza a justificado, con historial completo y efecto en los cierres de jornada y de sesión.

## Technical Context

**Framework**: Next.js 15. **Storage**: `justificaciones` y `justificaciones_historial`.
**Testing**: Vitest, pgTAP, Playwright.
**Performance**: justificar <1 min; consulta del historial <2 s.
**Constraints**: motivo y observación obligatorios; Docente sólo sus cursos.

## Constitution Check

| Principio | Cumplimiento |
|---|---|
| I | El motivo se trata como dato sensible y sólo lo ve el personal autorizado. |
| IV | RLS por curso para el Docente. |
| V | Toda justificación y reversión deja historial y auditoría. |

Pasa sin excepciones.

## Design

- **Modelo**: una justificación apunta a un registro (`referencia_asistencia_id`) o a una fecha
  (`permiso previo`). El permiso puede aplicar a puerta, aula o ambos.
- **Aplicación**: `aplicar_justificacion(id)` cambia el estado del registro y escribe historial y
  auditoría en una transacción.
- **Cierre**: `cerrar_jornada` y `cerrar_sesion` consultan permisos vigentes antes de marcar falta.
- **Reversión**: `revertir_justificacion(id, motivo)` restaura el estado anterior (`falta` o
  `tardanza`) y agrega historial; no borra.
- **UI**: formulario con motivo (lista corta + texto libre) y observación; vista de historial por
  alumno; indicador del aprobador en la tabla de asistencia.

## Phase 0 – Research

- **Decisión**: motivo como texto libre con sugerencias, sin catálogo. Motivo: menor fricción; el
  catálogo puede agregarse sin migración destructiva.
- **Decisión**: permisos previos por fecha, no por rango, para simplificar el cierre.

## Phase 1 – Artifacts

- [data-model.md](./data-model.md).
- Contratos: [http-api.md](../001-asistencia-qr-escolar/contracts/http-api.md) (Justificaciones) y
  [rls.md](../001-asistencia-qr-escolar/contracts/rls.md).
- [quickstart.md](./quickstart.md).

## Implementation Phases

1. Migraciones y RLS.
2. Función de aplicación y reversión con historial.
3. Formulario y consulta.
4. Integración con cierres de puerta y aula.
5. Pruebas de alcance y trazabilidad.

## Testing

- Unitarias: validación de motivo, alcance por rol.
- pgTAP: el Docente no justifica cursos ajenos; historial completo.
- E2E: justificar, revertir, verificar estado y cierre.

## Dependencies and Risks

- Depende de 004 y 005 (registros a justificar).
- Riesgo: justificar después del cierre y alterar reportes ya entregados. Mitigación: el reporte
  incluye aprobador y fecha de la justificación.
