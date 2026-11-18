# Implementation Plan: Reportes y dashboard

**Branch**: `007-reportes-dashboard` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Módulo 6 de la spec padre 001.

## Summary

Una consulta base (`v_asistencia_detalle`) alimenta la tabla filtrable, las exportaciones Excel/PDF y
el dashboard con Recharts. Todo respeta el rol y queda en auditoría.

## Technical Context

**Framework**: Next.js 15 + React 19. **Charts**: Recharts. **Exports**: exceljs, pdf-lib.
**Storage**: vistas SQL agregadas; sin tablas de hechos nuevas.
**Testing**: Vitest, Playwright (descargas), pgTAP (vistas y alcance).
**Performance**: reporte mensual <30 s; dashboard <3 s.
**Constraints**: mismo resultado en pantalla y archivo; exportación requiere conexión.

## Constitution Check

| Principio | Cumplimiento |
|---|---|
| I | Los filtros respetan el rol; no se exponen datos a terceros. |
| IV | RLS y filtro de alcance en la vista y en el route handler. |
| V | Cada exportación se audita con filtros y formato. |

Pasa sin excepciones.

## Design

- **Vista base**: `v_asistencia_detalle` unifica puerta y aula con `nivel`, estado, curso, docente y
  aprobador de justificación. `v_asistencia_diaria` agrega por alumno y fecha.
- **Filtros**: un objeto zod compartido entre pantalla, exportación y dashboard evita divergencias.
- **Exportación**: una sola función `buildQuery(filtros, alcance)` que devuelve filas; `exceljs` y
  `pdf-lib` sólo cambian el formato de salida.
- **Dashboard**: Recharts con la paleta de estados del sistema; KPIs con iconos y barras de
  progreso. Datos desde `v_metricas_mensuales` con caché de 60 s.
- **Auditoría**: `reportes_generados` registra usuario, rango, filtros, formato y filas.

## Phase 0 – Research

- **Decisión**: vistas SQL en lugar de cálculo en la aplicación. Motivo: RLS y rendimiento con 1,000
  alumnos.
- **Decisión**: Recharts impuesto por el promotor; se limita a gráficos de línea, barra y dona.

## Phase 1 – Artifacts

- [data-model.md](./data-model.md).
- Contratos: [http-api.md](../001-asistencia-qr-escolar/contracts/http-api.md) (Reportes y dashboard).
- [quickstart.md](./quickstart.md).

## Implementation Phases

1. Vistas y funciones de agregación.
2. Tabla filtrable y estado vacío.
3. Exportación Excel y PDF.
4. Dashboard con KPIs y gráficos.
5. Auditoría de reportes.
6. Pruebas de rendimiento y de alcance.

## Testing

- Unitarias: filtros y cálculo de porcentajes.
- pgTAP: una vista no devuelve datos fuera del rol.
- E2E: exportar y comparar con la pantalla; dashboard por rol.

## Dependencies and Risks

- Depende de 004, 005 y 006.
- Riesgo: rangos grandes degradan el dashboard. Mitigación: índices por fecha y caché de 60 s.
