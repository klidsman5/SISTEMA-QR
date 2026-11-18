# Quickstart: validación de asistencia de aula

**Feature**: 005-asistencia-aula

## Prerrequisitos

- Docente con el curso Matemática 3ro B y 30 alumnos en la sección.
- Credenciales impresas o QRs de prueba.

## Escenarios

| # | Acción | Resultado esperado |
|---|---|---|
| 1 | Abrir sesión de Matemática 3ro B | Sesión abierta con hora y tolerancia del curso. |
| 2 | Escanear 25 credenciales de la sección | Cada alumno queda registrado una vez. |
| 3 | Escanear a un alumno de 3ro A | Rechazo por sección. |
| 4 | Repetir el escaneo de un alumno a los 2 min | Sin duplicado. |
| 5 | Usar la cámara del celular del Docente | Registro idéntico al de la laptop. |
| 6 | Cerrar la sesión | 25 presentes, 5 ausentes; faltas para los 5. |
| 7 | Volver a cerrar | Sin faltas duplicadas. |
| 8 | Intentar registrar en la sesión cerrada | Rechazo. |
| 9 | Abrir sesión de un curso ajeno por URL | 403. |
| 10 | Registrar sin red y reconectar | Eventos sincronizados sin duplicados. |

## Verificación técnica

```bash
pnpm test -- aula
pnpm test:e2e -- aula
supabase test db -- sesiones
```

Criterios: [spec.md](./spec.md#success-criteria-mandatory).
