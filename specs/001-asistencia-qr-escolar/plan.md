# Implementation Plan: Plataforma de Asistencia Escolar por QR (arquitectura común)

**Branch**: `001-asistencia-qr-escolar` | **Date**: 2026-11-17 | **Spec**: [spec.md](./spec.md)

**Input**: Spec padre y specs hijas 002 a 008.

## Summary

Una sola aplicación web instalable (PWA) en Next.js con TypeScript, desplegada sobre Supabase. Tres
áreas por rol comparten una librería de escaneo QR, una cola offline en IndexedDB (Dexie) y un
servidor que aplica reglas de negocio y RLS. Los módulos 002 a 008 se implementan en este orden:
académico → padrón → offline → puerta → aula → justificaciones → reportes.

## Technical Context

**Language/Version**: TypeScript 5.x sobre Node.js 22 LTS.

**Primary Dependencies**: Next.js 15 (App Router), React 19, Tailwind CSS 4, Recharts, Dexie 4,
@supabase/supabase-js 2, @supabase/ssr, zod, @zxing/browser, qrcode, pdf-lib, exceljs, date-fns-tz.

**Storage**: PostgreSQL 15 en Supabase (central); IndexedDB (Dexie) en el dispositivo.

**Testing**: Vitest + Testing Library (unitarias y componente), Playwright (E2E y offline), pgTAP
(RLS y funciones SQL).

**Target Platform**: Navegador moderno en laptop educativa (1366×768), tablet y celular del
personal. PWA instalable con app shell cacheado.

**Project Type**: Aplicación web PWA con backend BaaS (Supabase) y funciones programadas.

**Performance Goals**: confirmación de escaneo <1 s local y <2 s con red; 1,000 entradas en 15 min;
cierre de jornada <1 min; reporte mensual <30 s; dashboard <3 s.

**Constraints**: operación offline de un día completo; 1,000 alumnos; sólo entradas; sin
notificaciones a terceros; autenticación por contraseña sin segundo factor.

**Scale/Scope**: 1 colegio, 2 turnos, ~1,000 alumnos, ~40 secciones, ~12 cursos por sección, 3 roles.

## Constitution Check

*GATE: pasa antes de la Fase 0; re-evaluado tras el diseño.*

| Principio | Cómo lo cumple el plan |
|---|---|
| I. Privacidad de menores | RLS por rol; el QR sólo contiene un UUID; no se integran canales de mensajería; no se guardan datos de salud, sólo motivo de justificación. |
| II. Doble nivel y contextos | Tablas separadas `asistencias_puerta` y `asistencias_curso`; debounce por `contexto` independiente. |
| III. Offline-First | Cola Dexie con `evento_id` UUID y `unique` en el servidor; sincronización por lotes idempotente. |
| IV. RBAC | RLS en Postgres + verificación de rol en cada route handler; pruebas pgTAP. |
| V. Trazabilidad | Tablas de historial de justificaciones y auditoría; cierre idempotente con `unique(turno, fecha)`. |

Sin violaciones; no se requiere Complexity Tracking.

## Project Structure

### Documentation (esta feature)

```text
specs/001-asistencia-qr-escolar/
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   ├── http-api.md
│   └── rls.md
└── quickstart.md

specs/002..008/
├── plan.md
├── data-model.md
└── quickstart.md
```

### Source Code (repository root)

```text
app/
├── (auth)/login/
├── (admin)/admin/{usuarios,estructura,padron,credenciales,justificaciones,reportes,dashboard}/
├── (puerta)/puerta/{escanear,registros,cierre}/
├── (docente)/aula/{sesiones,escanear,cierre}/
└── api/{auth,sync,attendance,admin,reports,dashboard,sesiones}/

src/
├── components/            # UI compartida (badges de estado, tarjetas KPI, indicador de red)
├── features/
│   ├── admin/
│   ├── puerta/
│   ├── aula/
│   ├── reportes/
│   └── sync/
├── lib/
│   ├── supabase/{client,server,admin}.ts
│   ├── offline/{db.ts,queue.ts,sync.ts}
│   ├── qr/{scanner.ts,generator.ts}
│   ├── export/{pdf.ts,xlsx.ts}
│   ├── rules/{estado.ts,debounce.ts}
│   └── validation/*.ts
└── types/

supabase/
├── migrations/            # esquema, RLS, funciones y pg_cron
├── seed.sql
└── functions/             # opcional: tareas que no caben en pg_cron

tests/
├── unit/
├── integration/
├── e2e/
└── rls/
```

**Structure Decision**: una sola app Next.js (route groups por rol) para compartir el escáner, la
cola offline y los componentes visuales. Supabase concentra autenticación, datos y políticas; no se
crea backend propio.

## Cross-cutting Design

- **Escaneo**: `@zxing/browser` con cámara continua; fallback a `BarcodeDetector` si existe. El lector
  del QR entrega el UUID y se resuelve contra un padrón local (Dexie) para responder sin red.
- **Tiempo**: se guarda `hora_dispositivo` y `recibido_en`. El estado se calcula en el servidor con la
  regla vigente y se **congela** (`hora_entrada_aplicada`, `tolerancia_aplicada`) para que un cambio
  de horario no altere registros históricos.
- **Debounce**: función `evaluar_debounce(contexto, alumno_id, ocurrido_en)` en SQL; el cliente
  aplica una ventana local para dar respuesta inmediata y el servidor es la autoridad.
- **Sincronización**: `POST /api/sync/batch` con hasta 200 eventos; cada evento lleva `evento_id`.
  El servidor inserta con `ON CONFLICT DO NOTHING` y responde por evento (aplicado, duplicado,
  descartado, inválido).
- **Cierre de jornada**: función SQL `cerrar_jornada(turno, fecha)` llamada por pg_cron o por el
  Administrador; idempotente.
- **Autorización**: RLS en todas las tablas; los route handlers usan el cliente del usuario (no la
  service key) salvo tareas programadas.

## Phase 0 – Research

Ver [research.md](./research.md). No quedan `NEEDS CLARIFICATION` de nivel técnico.

## Phase 1 – Design

- [data-model.md](./data-model.md): esquema completo y transiciones.
- [contracts/http-api.md](./contracts/http-api.md): endpoints y payloads.
- [contracts/rls.md](./contracts/rls.md): políticas por tabla y rol.
- [quickstart.md](./quickstart.md): puesta en marcha y validación end-to-end.

## Implementation Order

1. `002` (cuentas y estructura) — sin dependencias.
2. `003` (padrón y credenciales) — depende de 002.
3. `004` (puerta) — define la función de registro y la reconciliación; depende de 002 y 003.
4. `005` (aula) — define su función de registro y cierre; depende de 002 y 003.
5. `008` (offline y sincronización) — transporta y llama a las funciones de 004 y 005; no las duplica.
6. `006` (justificaciones) — depende de 004 y 005.
7. `007` (reportes y dashboard) — depende de todo lo anterior.

Las tareas de 004 y 005 se implementan hasta sus funciones de registro antes de empezar 008. Si se
desarrolla 008 en paralelo, se usa un adaptador con stubs documentados, nunca una segunda función de
aplicación de eventos.

## Complexity Tracking

Sin violaciones constitucionales. La PWA con cola local es necesaria por el requisito offline y no
tiene alternativa más simple que cumpla el Principio III.
