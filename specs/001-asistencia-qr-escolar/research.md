# Research: Decisiones técnicas de la plataforma

**Feature**: 001-asistencia-qr-escolar | **Date**: 2026-11-17

Cada decisión resuelve una incógnita del plan común. Las specs hijas heredan estas decisiones.

## D1. Marco de la aplicación

- **Decision**: Next.js 15 con App Router, React 19 y TypeScript, desplegado como PWA instalable.
- **Rationale**: una sola base de código para los tres roles, renderizado en servidor para reportes y
  route handlers para la API; el service worker y Dexie cubren el requisito offline.
- **Alternatives considered**: Vite + React SPA (sin backend propio, más piezas sueltas), Flutter
  (duplica lógica y no encaja con Tailwind/Recharts), Electron (sobredimensionado).

## D2. Backend y autenticación

- **Decision**: Supabase (Postgres + Auth + RLS + pg_cron + Edge Functions puntuales). El usuario se
  identifica con un correo sintético `usuario@colegio.local` derivado del nombre de usuario; la
  contraseña la gestiona Supabase Auth con hash.
- **Rationale**: cumple el stack impuesto, evita backend propio y permite RLS real (Principio IV).
- **Alternatives considered**: tabla de usuarios con hash propio (más superficie de error en
  seguridad), Auth0/Clerk (costo y dependencia extra).

## D3. Escaneo QR

- **Decision**: `@zxing/browser` con `decodeFromVideoDevice`, lectura continua, y `BarcodeDetector`
  cuando esté disponible.
- **Rationale**: funciona en laptop y celular, sin app nativa; control del debounce visual y del
  flash de borde.
- **Alternatives considered**: `html5-qrcode` (menos control del ciclo de cámara), lector de hardware
  como único medio (excluye laptops).

## D4. Generación de QR y credenciales

- **Decision**: QR con contenido `ASIS:<uuid_v4>` generado en el servidor con `qrcode`; PDF con
  `pdf-lib` y una plantilla de 10 carnets por hoja A4.
- **Rationale**: el QR no expone datos personales (Principio I) y el PDF se genera por streaming sin
  bloquear el servidor.
- **Alternatives considered**: QR con JSON del alumno (expone datos), generación en el cliente
  (costoso con 1,000 carnets).

## D5. Exportación

- **Decision**: Excel con `exceljs` y PDF con `pdf-lib`, generados en un route handler y descargados
  por streaming. Los datos salen de la misma consulta que la vista.
- **Rationale**: cumple "mismo contenido que pantalla" y evita duplicar la lógica de filtros.
- **Alternatives considered**: generación en el navegador (riesgo de datos desincronizados),
  servicio externo (costo y privacidad).

## D6. Sincronización offline

- **Decision**: cola Dexie `eventos_pendientes` con `evento_id` UUID v4 generado en el dispositivo.
  Lotes de 200 contra `POST /api/sync/batch`; el servidor inserta con `ON CONFLICT (evento_id) DO
  NOTHING` y responde el resultado por evento.
- **Rationale**: idempotencia real, reintentos seguros y trazabilidad de descartes (Principio III).
- **Alternatives considered**: autoincrementales locales (colisionan entre dispositivos), envío
  evento por evento (lento en lotes de 1,000), Last-Write-Wins sin debounce (duplica asistencia).

## D7. Regla de estado y congelado del horario

- **Decision**: el estado se calcula en el servidor al aplicar el evento usando el horario vigente del
  grado o curso y se guarda junto con los valores aplicados (`hora_entrada_aplicada`,
  `tolerancia_aplicada`). Los registros históricos no se recalculan.
- **Rationale**: cumple FR-014 de 002 y el requisito de no reescribir el pasado.
- **Alternatives considered**: calcular siempre con el horario actual (altera el pasado), guardar sólo
  el estado (no se puede auditar la regla aplicada).

## D8. Debounce

- **Decision**: función SQL `evaluar_debounce(contexto, alumno_id, ocurrido_en)` que devuelve
  `aplicar` o `descartar` y el evento previo. El cliente usa una ventana local sólo para la
  confirmación inmediata.
- **Rationale**: una sola autoridad, consistente entre dispositivos y sin carreras.
- **Alternatives considered**: debounce sólo en el cliente (se burla con dos dispositivos).

## D9. Cierre de jornada

- **Decision**: función `cerrar_jornada(p_turno, p_fecha)` en Postgres, idempotente por
  `unique(turno_id, fecha)` en `cierres_jornada`; programada con `pg_cron` a la hora de cierre de cada
  turno y ejecutable a mano desde el panel.
- **Rationale**: no depende de la app abierta, y la idempotencia la garantiza la base.
- **Alternatives considered**: tarea en Edge Function (más piezas), cierre sólo manual (olvidos).

## D10. Pruebas

- **Decision**: Vitest + Testing Library para reglas y componentes; Playwright para E2E y modo
  offline; pgTAP para RLS, debounce y cierre.
- **Rationale**: cubre los criterios medibles y las reglas críticas exigidas por el Flujo de Calidad.
- **Alternatives considered**: sólo E2E (lento y frágil), sólo unitarias (no prueba RLS).

## D11. Tiempo y zona horaria

- **Decision**: `timestamptz` en Postgres; configuración `America/Lima` por variable de entorno;
  `date-fns-tz` en el cliente. La fecha de asistencia se deriva de la zona del colegio.
- **Rationale**: evita registros del día equivocado por desfase horario.
- **Alternatives considered**: `timestamp` sin zona (errores en cambios de horario), UTC puro en
  pantalla (confunde al operador).
