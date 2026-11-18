# Quickstart: validación de gestión académica

**Feature**: 002-gestion-academica

## Prerrequisitos

- Entorno levantado según [001/quickstart.md](../001-asistencia-qr-escolar/quickstart.md).
- Sesión como Administrador (`admin`).

## Escenarios

| # | Acción | Resultado esperado |
|---|---|---|
| 1 | Crear Docente `docente2` | Cuenta activa; puede iniciar sesión. |
| 2 | Iniciar sesión como `docente2` e ir a `/admin/usuarios` | 403 / sin acceso. |
| 3 | Crear grado "4to", secciones A y B | Ambas disponibles en padrón y cursos. |
| 4 | Asignar "Historia" de 4to A a `docente2` | El Docente ve el curso al entrar. |
| 5 | Asignar a `docente2` dos cursos a la misma hora | Aparece advertencia de solapamiento. |
| 6 | Cambiar la hora de entrada de 4to a 07:45 | Los registros previos conservan su estado. |
| 7 | Desactivar `docente2` | No puede iniciar sesión; su curso queda pendiente de asignación. |
| 8 | Consultar auditoría con filtro usuario `admin` | Aparecen los cambios con valor anterior y nuevo. |
| 9 | Restablecer la contraseña de `docente2` | Recibe clave temporal y el sistema exige cambiarla al entrar. |
| 10 | Poner duración de bloque de 45 min en un curso con inicio 08:00 | El curso ocupa 08:00–08:45 y el solapamiento se detecta con ese rango. |
| 11 | Cambiar la retención a 180 días y exportar el periodo | La exportación incluye todo el periodo; nada se borra sin confirmar. |
| 12 | Intentar desactivar al único Administrador activo | El sistema lo impide. |

## Verificación técnica

```bash
pnpm test -- gestion-academica
supabase test db -- rls_academico
```

Criterios: [spec.md](./spec.md#success-criteria-mandatory).
