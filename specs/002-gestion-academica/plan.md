# Implementation Plan: Gestión académica y cuentas

**Branch**: `002-gestion-academica` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Módulo 1 de la spec padre 001.

## Summary

CRUD administrativo de cuentas, grados, secciones, cursos, turnos y horarios, con auditoría
automática y verificación de solapamiento de horarios del Docente. La estructura resultante es la
entrada de los módulos de puerta, aula y reportes.

## Technical Context

**Language/Version**: TypeScript 5.x / Node 22. **Framework**: Next.js 15 App Router.
**Storage**: Supabase Postgres. **Auth**: Supabase Auth con usuario → correo sintético.
**Testing**: Vitest, Playwright, pgTAP.
**Performance**: CRUD <1 s; carga de estructura completa <10 min de trabajo humano.
**Constraints**: sólo Administrador escribe; Docente y Auxiliar leen lo necesario.

## Constitution Check

| Principio | Cumplimiento |
|---|---|
| I | Sólo datos del personal; no hay datos de alumnos en este módulo. |
| IV | RLS por rol; `usuarios.rol` sólo lo cambia el Administrador. |
| V | Cada escritura dispara auditoría con valor anterior y nuevo. |

Pasa sin excepciones.

## Design

- **UI**: `/admin/usuarios`, `/admin/estructura`, `/admin/horarios`, con tablas y formularios
  validados con zod; confirmación antes de desactivar.
- **Mutaciones**: server actions que llaman a RPC de Postgres; la lógica de escritura vive en SQL para
  poder auditarla.
- **Auditoría**: trigger `trg_auditoria` en `usuarios`, `grados`, `secciones`, `cursos`, `turnos`
  que inserta en `auditoria` con `to_jsonb(OLD)` y `to_jsonb(NEW)`.
- **Solapamiento**: consulta `cursos_solapados(docente_id)` que compara `hora_inicio` y
  `hora_inicio + duracion_bloque_min`; se muestra advertencia, no bloqueo.
- **Historial**: desactivar es `activo = false`; nunca `DELETE`.
- **Restablecimiento**: el Administrador genera una contraseña temporal desde la ficha del usuario;
  Supabase Auth la aplica y el sistema marca `debe_cambiar_password` hasta el primer ingreso. No se
  envían correos ni mensajes.
- **Configuración**: tabla `configuracion` con claves tipadas (`debounce_puerta_min`,
  `desfase_reloj_min`, `duracion_bloque_min`, `retencion_dias`); los módulos 004, 005 y 008 la leen.
- **Retención**: tarea programada que exporta el periodo y exige confirmación del Administrador antes
  de eliminar; sin confirmación, no borra nada.

## Phase 0 – Research

- **Decisión**: auditoría por trigger en vez de en la aplicación. Motivo: no se puede omitir desde
  ningún cliente. Alternativa descartada: log en route handler.
- **Decisión**: usuario con correo sintético. Detalle en 001/research.md D2.

## Phase 1 – Artifacts

- [data-model.md](./data-model.md): tablas, restricciones y política de desactivación.
- Contratos: [http-api.md](../001-asistencia-qr-escolar/contracts/http-api.md) (sección Administración)
  y [rls.md](../001-asistencia-qr-escolar/contracts/rls.md).
- [quickstart.md](./quickstart.md): escenarios de validación.

## Implementation Phases

1. Migración de tablas y RLS; seed de turnos.
2. Server actions de usuarios, restablecimiento de contraseña y estructura con zod.
3. Duración de bloque y detección de solapamiento.
4. Trigger de auditoría y consulta de auditoría.
5. Tabla de configuración, pantalla de parámetros y exportación previa a la retención.
6. UI de administración y pruebas.

## Testing

- Unitarias: validaciones de formulario y reglas de desactivación.
- pgTAP: RLS (Docente no escribe), trigger de auditoría.
- E2E: crear docente, asignarle curso, verificar alcance.

## Dependencies and Risks

- Sin dependencias de otros módulos; es la base del resto.
- Riesgo: estructura mal cargada bloquea el padrón. Mitigación: validar grados y secciones antes de
  habilitar la importación.
- Riesgo: sin correo, un usuario bloqueado depende del Administrador. Mitigación: contraseña temporal
  de un solo uso y registro en auditoría.
- Riesgo: la retención borra datos por error. Mitigación: exportación obligatoria y confirmación
  explícita; por defecto no elimina.
