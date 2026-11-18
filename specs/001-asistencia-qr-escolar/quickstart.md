# Quickstart: validación de la plataforma

Guía para levantar el entorno y comprobar que los módulos funcionan de extremo a extremo. No
contiene implementación; los detalles de esquema y API están en [data-model.md](./data-model.md) y
[contracts/](./contracts/).

## Prerrequisitos

- Node.js 22 LTS y pnpm.
- Docker (para Supabase local) y Supabase CLI.
- Navegador con cámara; un segundo dispositivo o una ventana de incógnito para simular al Docente.
- Un QR de prueba generado por el sistema o una imagen de credencial.

## Puesta en marcha

```bash
pnpm install
supabase start
supabase db reset          # aplica migraciones y seed
pnpm dev                   # http://localhost:3000
```

Variables de entorno mínimas (`.env.local`):

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # sólo para tareas programadas
TZ_COLEGIO=America/Lima
```

## Datos de prueba

`supabase/seed.sql` crea:

- Turnos mañana y tarde; grado 3ro con secciones A y B; cursos Matemática y Lenguaje con Docente.
- 40 alumnos con credencial vigente y 1 credencial revocada.
- Usuarios: `admin`, `puerta1`, `docente1` (contraseña de desarrollo `Demo1234!`).

## Escenarios de validación

| # | Escenario | Resultado esperado |
|---|---|---|
| 1 | Login con cada rol | Cada uno ve sólo su área; el Docente no ve datos ajenos. |
| 2 | Escanear credencial dentro de tolerancia en puerta | Evento puntual con hora y nombre en pantalla. |
| 3 | Escanear fuera de tolerancia | Estado tardanza, congelando la tolerancia aplicada. |
| 4 | Escanear dos veces al mismo alumno | Segundo intento sin evento (debounce). |
| 5 | Escanear al mismo alumno en su curso tras puerta | Evento de aula creado normalmente. |
| 6 | Desconectar red, registrar 20 eventos, reconectar | Cola se vacía sin duplicados; `evento_id` únicos. |
| 7 | Cerrar sesión de aula con 25 de 30 | Los 5 ausentes quedan como falta. |
| 8 | Justificar una falta | Estado justificado con aprobador y motivo. |
| 9 | Cierre de jornada dos veces | Sin faltas duplicadas. |
| 10 | Exportar reporte del mes | Excel y PDF coinciden con la pantalla. |
| 11 | Ver dashboard como Docente | Sólo métricas de sus secciones. |
| 12 | Intentar acceder a `/admin` con rol Docente | 403 y redirección. |

## Verificación técnica

```bash
pnpm test            # unitarias
pnpm test:e2e        # Playwright, incluye modo offline
supabase test db     # pgTAP: RLS, debounce, cierre
```

Criterios de aceptación globales en [spec.md](./spec.md#success-criteria-mandatory). Los escenarios
por módulo están en el `quickstart.md` de cada spec hija.
