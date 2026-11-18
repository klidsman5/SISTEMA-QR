# Quickstart: validación de padrón y credenciales

**Feature**: 003-padron-y-credenciales

## Prerrequisitos

- Entorno de [001/quickstart.md](../001-asistencia-qr-escolar/quickstart.md).
- Archivos de prueba: `padron_1000.xlsx`, `padron_con_errores.csv`, `padron_anio_nuevo.xlsx` en
  `tests/fixtures/`.

## Escenarios

| # | Acción | Resultado esperado |
|---|---|---|
| 1 | Importar `padron_1000.xlsx` | Vista previa con 1,000 válidas; confirmar crea 1,000 alumnos con QR. |
| 2 | Importar archivo con 10 filas incompletas | 10 errores reportados; ninguna fila parcial creada. |
| 3 | Importar DNI existente | Reportado como conflicto; no duplica. |
| 4 | Generar PDF de 3ro B | Un carnet por alumno, QR legible. |
| 5 | Escanear el QR de un carnet generado | Identifica al mismo alumno. |
| 6 | Revocar credencial de un alumno | El QR anterior es rechazado; el nuevo registra. |
| 7 | Cargar padrón del año siguiente con un cambio de sección | Historial conservado; matrícula nueva creada. |
| 8 | Cargar padrón sin un alumno | Alumno de baja y credencial revocada. |
| 9 | Importar CSV con acentos | Nombres correctos en pantalla y en el carnet. |

## Verificación técnica

```bash
pnpm test -- padron
pnpm test:e2e -- padron
supabase test db -- credenciales
```

Criterios: [spec.md](./spec.md#success-criteria-mandatory).
