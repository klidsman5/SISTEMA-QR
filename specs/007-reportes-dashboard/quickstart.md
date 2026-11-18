# Quickstart: validación de reportes y dashboard

**Feature**: 007-reportes-dashboard

## Prerrequisitos

- Datos de al menos un mes (seed de 001 o carga masiva).
- Sesiones como `admin`, `puerta1` y `docente1`.

## Escenarios

| # | Acción | Resultado esperado |
|---|---|---|
| 1 | Reporte del mes como `admin` | Tabla y Excel/PDF con los mismos registros. |
| 2 | Filtrar nivel "aula" y estado "falta" | Sólo faltas de aula. |
| 3 | Filtrar por turno mañana y 3ro B | Sólo esa combinación. |
| 4 | Reporte como `puerta1` | Sólo registros de puerta. |
| 5 | Reporte como `docente1` | Sólo sus secciones y cursos. |
| 6 | Rango sin datos | Estado vacío claro; exportación exige confirmación. |
| 7 | Exportar 1,000 alumnos | Termina en <30 s sin bloquear a otros usuarios. |
| 8 | Ver dashboard como `admin` | KPIs y gráficos con paleta de estados. |
| 9 | Cambiar mes en el dashboard | Se recalcula en <3 s. |
| 10 | Dashboard como `docente1` | Sólo sus secciones. |
| 11 | Consultar auditoría de reportes | Aparecen usuario, filtros y formato. |

## Verificación técnica

```bash
pnpm test -- reportes
pnpm test:e2e -- reportes
supabase test db -- vistas
```

Criterios: [spec.md](./spec.md#success-criteria-mandatory).
