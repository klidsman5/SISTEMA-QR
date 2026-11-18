# Asistencia QR

Sistema de asistencia escolar por credencial QR. Next.js 15 + Supabase.

## Estado

Implementados los módulos **002 a 008**: cuentas y estructura, padrón y credenciales, asistencia de
puerta, asistencia de aula, justificaciones, reportes y dashboard, y operación offline con
sincronización en lotes.

Para un proyecto nuevo en Supabase, ejecuta en el SQL Editor, en este orden:

1. `supabase/all_in_one.sql` (módulo 002)
2. `supabase/padron_cloud.sql` (módulo 003)
3. `supabase/puerta_cloud.sql` (módulo 004)
4. `supabase/aula_cloud.sql` (módulo 005)
5. `supabase/justificaciones_cloud.sql` (módulo 006)
6. `supabase/reportes_cloud.sql` (módulo 007)
7. `supabase/offline_cloud.sql` (módulo 008)

## Requisitos

- Node.js 22 o superior.
- Supabase CLI y Docker para el entorno local.
- Supabase Auth con correo sintético: `usuario@colegio.local`.

## Puesta en marcha

```bash
npm install
cp .env.example .env.local        # completa las claves
supabase start
supabase db reset                 # migraciones + seed
npm run seed:admin                # crea el Administrador inicial
npm run dev
```

`npm run seed:admin` usa `scripts/seed-admin.mjs` y requiere `SUPABASE_SERVICE_ROLE_KEY`.

## Variables de entorno

| Variable | Uso |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Endpoint del proyecto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente y Server Components |
| `SUPABASE_SERVICE_ROLE_KEY` | Alta de cuentas y restablecimiento; nunca en el cliente |
| `NEXT_PUBLIC_DOMAIN_SUFFIX` | Dominio del correo sintético (por defecto `colegio.local`) |
| `TZ_COLEGIO` | Zona horaria de la institución |

## Comandos

| Comando | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo |
| `npm run typecheck` | Verificación de tipos |
| `npm test` | Pruebas unitarias con Vitest |
| `npm run test:e2e` | Playwright (requiere Supabase y un Administrador) |
| `supabase test db` | pgTAP: RLS, auditoría y restricciones |

## Estructura

```text
app/            rutas por área: (auth), (admin), (puerta), (docente) y API
src/features/   lógica por módulo (admin, auth)
src/lib/        Supabase, reglas de horario y solapamiento
src/components/ UI compartida
supabase/       migraciones y seed
tests/          unitarias, integración, RLS y E2E
specs/          especificaciones, planes y tareas (SDD)
```

## Seguridad

- RLS en todas las tablas; el Administrador es el único que escribe estructura y cuentas.
- El service role se usa sólo en el servidor, en rutas protegidas por rol.
- Auditoría automática por trigger en cuentas, estructura y configuración.
- El restablecimiento genera una contraseña temporal y obliga a cambiarla.

## Limitaciones conocidas

- El módulo 002 no incluye padrón ni asistencia; llegarán con 003 a 008.
- Las tareas E2E requieren Supabase local y datos semilla.
- Los mensajes de resultado de algunos formularios server-side no se muestran en pantalla; el
  restablecimiento de contraseña sí, por ser un dato que el Administrador debe copiar.
