# Feature Specification: Reportes y dashboard

**Feature Branch**: `007-reportes-dashboard`

**Created**: 2026-11-17

**Status**: Draft

**Input**: Módulo 6 de la spec padre [`001-asistencia-qr-escolar`](../001-asistencia-qr-escolar/spec.md): "Generación de Reportes (Excel .xlsx y PDF) ... Dashboard Estadístico".

**Trazabilidad**: los identificadores `FR-###` y `SC-###` son locales. Fuera de esta spec se citan como `007/FR-###`.

## Alcance

Consulta, exportación y visualización de la asistencia ya registrada: reportes Excel y PDF con filtros, y dashboard con métricas. No registra ni modifica asistencia.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Exportar el récord de asistencia (Priority: P1)

El Administrador, el Auxiliar de Puerta o el Docente eligen un rango de fechas y filtros, y descargan el detalle en Excel o PDF.

**Why this priority**: Es la entrega formal de información a la dirección y a los Docentes.

**Independent Test**: Generar un reporte de un mes para una sección y comparar el archivo con la consulta en pantalla.

**Acceptance Scenarios**:

1. **Given** un rango de fechas y filtros, **When** se exporta a Excel, **Then** el archivo contiene exactamente los registros filtrados.
2. **Given** el mismo rango, **When** se exporta a PDF, **Then** el contenido coincide con el Excel.
3. **Given** un Docente, **When** exporta, **Then** sólo aparecen sus secciones y cursos.

---

### User Story 2 - Filtrar por nivel, estado y estructura (Priority: P1)

El usuario filtra por estudiante, grado, sección, curso, turno, nivel (Puerta o Aula) y estado (Puntual, Tardanza, Falta, Justificado).

**Why this priority**: Sin filtros, un reporte de 1,000 alumnos es inutilizable.

**Independent Test**: Filtrar por nivel "Aula" y estado "Falta" y verificar que el resultado contiene sólo esos registros.

**Acceptance Scenarios**:

1. **Given** el filtro "Puerta" y estado "Tardanza", **When** se consulta, **Then** sólo aparecen entradas tardías de puerta.
2. **Given** el filtro por sección y turno, **When** se consulta, **Then** sólo aparece la sección y turno elegidos.
3. **Given** un filtro sin resultados, **When** se consulta, **Then** se muestra un estado vacío claro y no se permite exportar un archivo vacío sin advertencia.

---

### User Story 3 - Dashboard estadístico (Priority: P2)

El Administrador ve el porcentaje de asistencia diaria y mensual, la tasa de puntualidad, el ausentismo por grado y sección y la tendencia histórica. El Docente ve lo suyo.

**Why this priority**: Aporta valor de gestión, pero el sistema opera sin él.

**Independent Test**: Con datos de un mes simulado, comparar los porcentajes con un cálculo manual.

**Acceptance Scenarios**:

1. **Given** datos de los últimos 30 días, **When** se abre el dashboard, **Then** se ven asistencia diaria, puntualidad y ausentismo por grado y sección.
2. **Given** un cambio de mes, **When** se aplica, **Then** las métricas se recalculan en menos de 3 segundos.
3. **Given** un Docente, **When** abre el dashboard, **Then** sólo ve sus secciones.

---

### User Story 4 - Auditar la generación de reportes (Priority: P2)

Cada reporte generado queda registrado con usuario, fecha, filtros y formato.

**Why this priority**: Permite saber quién extrajo qué información y cuándo.

**Independent Test**: Generar dos reportes con filtros distintos y verificar ambos eventos en la auditoría.

**Acceptance Scenarios**:

1. **Given** una exportación, **When** se consulta la auditoría, **Then** aparece el usuario, la fecha, los filtros y el formato.
2. **Given** una exportación fallida, **When** se consulta la auditoría, **Then** el fallo queda registrado.

---

### Edge Cases

- Rango de fechas sin datos: se informa y no se genera un archivo vacío sin confirmación.
- Rango de más de un año: se advierte el tamaño y se sugiere dividir.
- Exportación de 1,000 alumnos: se procesa sin bloquear a otros usuarios.
- Docente sin cursos: el reporte se muestra vacío con un aviso explicativo.
- Reporte solicitado sin conexión: se informa que la exportación requiere conexión.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST generar reportes en Excel (.xlsx) y PDF con el detalle de asistencia por rango de fechas.
- **FR-002**: Los reportes MUST permitir filtrar por estudiante, grado, sección, curso, turno, nivel (Puerta o Aula) y estado (Puntual, Tardanza, Falta, Justificado).
- **FR-003**: Cada reporte MUST respetar el alcance del rol: el Administrador ve todo, el Auxiliar sólo puerta y el Docente sólo la asistencia de aula de los cursos que dicta. El Docente MUST poder generar su propio reporte sin depender del Administrador.
- **FR-004**: El reporte MUST incluir fecha, hora, alumno, grado, sección, curso, nivel, estado y aprobador de la justificación cuando aplique.
- **FR-005**: El archivo exportado MUST coincidir con los datos de la consulta en pantalla.
- **FR-006**: Cada generación de reporte MUST registrarse en auditoría con usuario, fecha, filtros y formato.
- **FR-007**: El dashboard MUST mostrar porcentaje de asistencia diaria y mensual, tasa de puntualidad, ausentismo por grado y sección, y tendencia histórica.
- **FR-008**: El dashboard MUST respetar el alcance del rol.
- **FR-009**: El dashboard MUST actualizar las métricas en menos de 3 segundos para un rango de un mes.
- **FR-010**: El sistema MUST mostrar un estado vacío claro cuando un filtro no devuelve resultados.
- **FR-011**: El sistema MUST permitir exportar sólo si hay resultados o si el usuario confirma una exportación vacía.
- **FR-012**: Todo reporte histórico MUST mostrar el grado y la sección que el alumno tenía en la fecha del registro, no los vigentes al momento de generar el reporte.
- **FR-013**: Los reportes del Docente MUST limitarse al nivel Aula y a sus cursos asignados; MUST NOT incluir registros de puerta ni cursos ajenos, aunque el usuario manipule los filtros de la URL.
- **FR-014**: El Docente MUST disponer de una pantalla propia de reportes dentro del área de aula, con los mismos filtros y formatos que el Administrador pero acotados a su alcance.

### Key Entities

- **Reporte**: Usuario, fecha de generación, rango de fechas, filtros, formato y cantidad de registros.
- **Métrica**: Asistencia diaria, asistencia mensual, puntualidad, ausentismo por grado o sección y tendencia.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un reporte mensual de la institución se genera en menos de 30 segundos.
- **SC-002**: El contenido del Excel y del PDF coincide al 100% con la consulta en pantalla.
- **SC-003**: El 100% de las exportaciones queda en auditoría con usuario, filtros y formato.
- **SC-004**: El 0% de los reportes de un Docente incluye cursos o secciones ajenos.
- **SC-005**: El dashboard de un mes responde en menos de 3 segundos.

## Assumptions

- Los reportes usan los datos ya sincronizados; no exportan eventos aún pendientes.
- El dashboard se calcula sobre registros de puerta y de aula combinados según el filtro de nivel.
- La exportación requiere conexión.
- El rango máximo razonable es un año escolar; rangos mayores se advierten.
- Los reportes no incluyen datos de apoderados porque no existen en el sistema.
