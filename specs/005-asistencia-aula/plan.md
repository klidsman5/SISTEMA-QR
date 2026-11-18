# Implementation Plan: Asistencia de aula

**Branch**: `005-asistencia-aula` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Módulo 4 de la spec padre 001.

## Summary

El Docente abre una sesión de su curso, escanea las credenciales impresas y cierra la sesión. El
cierre genera las faltas de los ausentes. La pantalla funciona sin red con la misma cola del módulo
008.

## Technical Context

**Framework**: Next.js 15 + PWA. **Scanner**: `@zxing/browser` (laptop o celular del Docente).
**Storage**: `sesiones_clase` y `asistencias_curso`.
**Testing**: Vitest, Playwright, pgTAP.
**Performance**: 35 alumnos en <3 min; cierre de sesión <1 min.
**Constraints**: sólo cursos asignados; una asistencia por alumno y sesión; sin teléfono del alumno.

## Constitution Check

| Principio | Cumplimiento |
|---|---|
| I | El alumno sólo presenta un QR con UUID; no usa cuenta ni dispositivo. |
| II | Contexto `curso:<id>` propio en el debounce; no interfiere con puerta. |
| IV | RLS limita sesiones y registros a los cursos del Docente. |
| V | El cierre de sesión es idempotente y la justificación conserva historial. |

Pasa sin excepciones.

## Design

- **Selección**: el Docente elige entre sus cursos del día; si no hay curso activo según horario, se
  avisa pero se permite abrir con confirmación.
- **Apertura**: `POST /sesiones` crea la sesión con `hora_inicio_aplicada` y `tolerancia_aplicada`
  del curso. Una sola sesión abierta por curso y fecha (índice parcial).
- **Registro**: `registrar_asistencia_curso(evento)` valida credencial vigente, sección y sesión
  abierta; aplica debounce por curso.
- **Cierre**: `cerrar_sesion(sesion)` genera faltas para los no registrados, respetando permisos
  previos; idempotente por `unique(sesion_id, alumno_id)`.
- **UI**: lista de presentes/ausentes, contador grande, tarjeta de resultado por color y botón de
  cierre con confirmación.

## Phase 0 – Research

- **Decisión**: sesión explícita (abrir/cerrar) en vez de ventana horaria implícita. Motivo: permite
  faltas confiables y controla el debounce por curso.
- **Decisión**: mismo motor de escaneo que puerta. Motivo: una sola ruta de código y pruebas.

## Phase 1 – Artifacts

- [data-model.md](./data-model.md).
- Contratos: [http-api.md](../001-asistencia-qr-escolar/contracts/http-api.md) (Aula) y
  [rls.md](../001-asistencia-qr-escolar/contracts/rls.md).
- [quickstart.md](./quickstart.md).

## Implementation Phases

1. Migración de `sesiones_clase` y `asistencias_curso`; función de registro y cierre.
2. Pantalla de selección de curso y apertura de sesión.
3. Escaneo y lista en vivo.
4. Cierre con faltas y confirmación.
5. Cola offline y sincronización.
6. Pruebas de alcance y E2E.

## Testing

- Unitarias: estado en el límite de tolerancia de la sesión; validación de sección.
- pgTAP: una sesión abierta por curso; una asistencia por alumno.
- E2E: registrar 35, cerrar y verificar 5 faltas.

## Dependencies and Risks

- Depende de 002 (cursos y horarios), 003 (credenciales) y 008 (cola).
- Riesgo: sesiones olvidadas abiertas. Mitigación: cierre automático al terminar el bloque.
