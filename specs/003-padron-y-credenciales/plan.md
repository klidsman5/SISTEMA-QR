# Implementation Plan: Padrón y credenciales

**Branch**: `003-padron-y-credenciales` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Módulo 2 de la spec padre 001.

## Summary

Importación masiva de alumnos con validación por fila, generación de credenciales QR y carnets PDF,
revocación y ciclo anual. El padrón alimenta el caché local de los dispositivos para escanear sin red.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 22. **Framework**: Next.js 15.
**Libraries**: exceljs (lectura XLSX), papaparse (CSV), qrcode, pdf-lib, zod.
**Storage**: Postgres (tablas de padrón) y generación de archivos en streaming.
**Testing**: Vitest (validaciones y parseo), Playwright (importación y PDF), pgTAP (índices únicos).
**Performance**: 1,000 filas <2 min; PDF de 1,000 carnets sin bloquear.
**Constraints**: UTF-8; una credencial vigente por alumno; el QR no expone datos.

## Constitution Check

| Principio | Cumplimiento |
|---|---|
| I | QR contiene sólo `ASIS:<uuid>`; el carnet muestra datos mínimos. |
| V | Cada importación y emisión queda en auditoría; bajas sin borrado. |

Pasa sin excepciones.

## Design

- **Importación en dos fases**: `POST /admin/padron/import` parsea y valida sin escribir alumnos;
  devuelve vista previa con errores por fila y un `import_token`. `POST /admin/padron/confirm`
  escribe en una transacción y genera credenciales.
- **Validación**: zod por fila; duplicados por DNI contra la base y dentro del archivo; grado y
  sección deben existir y estar activos.
- **Credenciales**: `qr_uuid uuid` generado en el servidor; índice parcial único de vigencia.
- **Carnets**: `pdf-lib` con plantilla de 10 por hoja A4, QR embebido como PNG; filtro por grado y
  sección; respuesta en streaming.
- **Ciclo anual**: `POST /admin/padron/anio` recibe el padrón nuevo, actualiza `matriculas`, da de
  baja a los ausentes y emite credenciales del año.
- **Caché local**: al abrir la app, el dispositivo descarga `padron_cache` (sólo lo necesario) para
  resolver QR sin red.

## Phase 0 – Research

- **Decisión**: dos fases con token de importación. Motivo: evita cargas parciales y permite revisar
  errores. Alternativa descartada: importación directa.
- **Decisión**: `pdf-lib` sobre `@react-pdf/renderer`. Motivo: control total del layout y menor peso
  en servidor.

## Phase 1 – Artifacts

- [data-model.md](./data-model.md).
- Contratos: [http-api.md](../001-asistencia-qr-escolar/contracts/http-api.md) (Administración) y
  [rls.md](../001-asistencia-qr-escolar/contracts/rls.md).
- [quickstart.md](./quickstart.md).

## Implementation Phases

1. Migraciones de `alumnos`, `matriculas`, `credenciales`, `importaciones` e índices únicos.
2. Parseo y validación con vista previa.
3. Confirmación transaccional y emisión de QR.
4. PDF de carnets en streaming.
5. Revocación, reemisión y ciclo anual.
6. Caché de padrón para offline.

## Testing

- Unitarias: validación de filas, duplicados, UTF-8.
- pgTAP: unicidad de DNI y de credencial vigente.
- E2E: importar 1,000 filas, generar PDF, revocar y verificar rechazo.

## Dependencies and Risks

- Depende de 002 (grados, secciones).
- Riesgo: archivos con formatos irregulares. Mitigación: vista previa obligatoria y errores por fila.
