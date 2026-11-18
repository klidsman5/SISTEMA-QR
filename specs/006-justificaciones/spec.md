# Feature Specification: Justificaciones y permisos

**Feature Branch**: `006-justificaciones`

**Created**: 2026-11-17

**Status**: Draft

**Input**: Módulo 5 de la spec padre [`001-asistencia-qr-escolar`](../001-asistencia-qr-escolar/spec.md): "Justificaciones y Permisos: Formulario en el panel web para que Administrador o Docente registren permisos previos o justificaciones posteriores".

**Trazabilidad**: los identificadores `FR-###` y `SC-###` son locales. Fuera de esta spec se citan como `006/FR-###`.

## Alcance

Registro de permisos previos y justificaciones posteriores sobre faltas y tardanzas, con trazabilidad completa. No modifica por sí mismo los registros de asistencia: cambia su estado y agrega historial.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Justificar una falta o tardanza (Priority: P1)

El Administrador o el Docente registra la justificación de un alumno con motivo y observación. El estado pasa a "Justificado" y queda registrado quién lo aprobó y cuándo.

**Why this priority**: Sin justificaciones, una ausencia legítima (enfermedad, cita médica) queda como falta en el reporte.

**Independent Test**: Registrar una falta y justificarla como Docente del curso; verificar el cambio de estado y la trazabilidad.

**Acceptance Scenarios**:

1. **Given** una falta de un alumno en un curso del Docente, **When** registra la justificación con motivo, **Then** el estado pasa a "Justificado" con aprobador y fecha.
2. **Given** un Docente, **When** intenta justificar una falta de un curso ajeno, **Then** el sistema lo impide.
3. **Given** una justificación sin motivo, **When** se intenta guardar, **Then** el sistema la rechaza.

---

### User Story 2 - Registrar un permiso previo (Priority: P2)

El Administrador o el Docente registra un permiso para una fecha futura. Si el alumno no registra entrada ese día, el cierre de jornada lo deja como "Justificado" y no como "Falta".

**Why this priority**: Evita que las ausencias avisadas con antelación se conviertan en faltas.

**Independent Test**: Registrar un permiso para mañana, simular el cierre de jornada y verificar que el alumno queda justificado.

**Acceptance Scenarios**:

1. **Given** un permiso previo aprobado para una fecha, **When** se ejecuta el cierre de esa fecha, **Then** el alumno queda como "Justificado".
2. **Given** un permiso para una fecha pasada, **When** se intenta registrar, **Then** el sistema lo trata como justificación posterior.
3. **Given** un permiso previo, **When** el alumno sí registra entrada, **Then** la entrada prevalece y el permiso queda sin efecto.

---

### User Story 3 - Corregir con trazabilidad (Priority: P2)

Si una justificación se registró por error, se revierte. El sistema conserva la justificación original y registra la corrección como un nuevo evento.

**Why this priority**: La institución debe poder explicar cualquier cambio de estado ante la dirección.

**Independent Test**: Justificar una falta, revertir la justificación y verificar que el historial conserva ambos movimientos.

**Acceptance Scenarios**:

1. **Given** una justificación aplicada, **When** se revierte con motivo, **Then** el estado vuelve a su valor anterior y el historial conserva ambos eventos.
2. **Given** el historial de un registro, **When** se consulta, **Then** muestra quién aprobó, cuándo y con qué motivo cada cambio.

---

### Edge Cases

- Justificación sobre una falta que aún no existe: se rechaza si la fecha no tiene registro.
- Justificación duplicada para el mismo registro y fecha: se advierte y se evita duplicar.
- Permiso que abarca varios días: se registra un permiso por cada fecha afectada.
- Alumno dado de baja: no se aceptan justificaciones nuevas; el historial se conserva.
- Docente sin el curso en el momento de justificar: pierde el acceso a justificar, pero lo ya registrado se conserva.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El Administrador y el Docente MUST poder registrar justificaciones posteriores y permisos previos.
- **FR-002**: El motivo y la observación MUST ser obligatorios.
- **FR-003**: Un Docente MUST poder justificar sólo registros de sus propios cursos; el Administrador, cualquiera.
- **FR-004**: Al justificar, el estado MUST cambiar de "Falta" o "Tardanza" a "Justificado" y MUST registrar quién aprobó y cuándo.
- **FR-005**: Un permiso previo MUST aplicarse en el cierre de jornada y en el cierre de sesión de aula de la fecha indicada.
- **FR-006**: Si el alumno registra entrada en una fecha con permiso, la entrada MUST prevalecer y el permiso MUST quedar sin efecto.
- **FR-007**: Las justificaciones MUST ser reversibles y cada cambio MUST agregar una entrada de historial sin borrar la anterior.
- **FR-008**: El sistema MUST impedir justificar registros inexistentes o de otra fecha.
- **FR-009**: El sistema MUST impedir justificaciones duplicadas sobre el mismo registro y fecha.
- **FR-010**: El sistema MUST permitir consultar el historial de justificaciones por alumno y rango de fechas, respetando el alcance del rol.
- **FR-011**: Las justificaciones MUST quedar registradas en auditoría con usuario, fecha y detalle.
- **FR-012**: Un permiso previo MUST crear el estado `justificado` de la fecha, y la entrada real del alumno MUST reemplazarlo por el estado de la entrada cuando ocurra, dejando rastro en auditoría (`004/FR-016` y `005/FR-015`).

### Key Entities

- **Justificación**: Registro de asistencia o fecha afectada, tipo (previo, posterior), motivo, observación, aprobado por, fecha de aprobación, estado (vigente, revertida).
- **Historial de justificación**: Cada cambio con usuario, fecha, motivo y valor anterior.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Justificar una falta tarda menos de 1 minuto.
- **SC-002**: El 100% de las justificaciones muestra aprobador, fecha y motivo en el historial.
- **SC-003**: El 100% de los permisos previos se refleja en el cierre de jornada de la fecha correspondiente.
- **SC-004**: El 0% de los Docentes puede justificar registros de cursos ajenos.
- **SC-005**: Revertir una justificación conserva el 100% del historial anterior.

## Assumptions

- Una justificación se aplica a un registro o a una fecha completa.
- El permiso previo se registra con la anticipación que defina la institución; no hay límite mínimo.
- Los motivos son texto libre más una observación; no se modelan catálogos en esta versión.
- El Docente sólo justifica lo de sus cursos; el Administrador justifica todo.
