# Feature Specification: Asistencia de aula

**Feature Branch**: `005-asistencia-aula`

**Created**: 2026-11-17

**Status**: Draft

**Input**: Módulo 4 de la spec padre [`001-asistencia-qr-escolar`](../001-asistencia-qr-escolar/spec.md): "Nivel 2 - Aula / Curso (Docente): ... a) Escaneo de la credencial QR única de cada estudiante al ingresar al aula". El QR de sesión se eliminó: los alumnos no usan teléfono.

**Trazabilidad**: los identificadores `FR-###` y `SC-###` son locales. Fuera de esta spec se citan como `005/FR-###`.

**Independencia de niveles**: la asistencia de aula pertenece al Docente del curso y es un registro distinto de la entrada de puerta. No se comparte, no se mezcla en reportes y no depende de que el alumno haya marcado en la puerta.

## Alcance

Registro de asistencia por curso dentro de una sesión de clase, con la credencial impresa del alumno. Incluye apertura y cierre de sesión y marcado de faltas. No incluye puerta, justificaciones ni el envío de mensajes.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar asistencia con la credencial del alumno (Priority: P1)

El Docente abre la sesión de su curso y escanea la credencial de cada alumno que entra al salón. El sistema registra Puntual o Tardanza y muestra el nombre.

**Why this priority**: Es el segundo nivel de control y el que usa el Docente en cada clase.

**Independent Test**: Abrir una sesión de 3ro B y escanear 30 credenciales; verificar que cada alumno queda registrado una vez con su estado.

**Acceptance Scenarios**:

1. **Given** un curso asignado con sesión abierta, **When** el Docente escanea una credencial de la sección, **Then** el alumno queda registrado como "Puntual" o "Tardanza".
2. **Given** un alumno de otra sección, **When** se escanea su credencial, **Then** el sistema rechaza el registro.
3. **Given** un alumno ya registrado en la sesión, **When** se escanea de nuevo dentro de la ventana de enfriamiento, **Then** no se duplica.
4. **Given** el escaneo con la cámara del celular del Docente, **When** detecta la credencial, **Then** el registro se crea igual que desde la laptop.

---

### User Story 2 - Cerrar la sesión y marcar faltas (Priority: P2)

Al terminar la clase, el Docente cierra la sesión. Ve quiénes quedaron registrados y marca como "Falta" a los ausentes.

**Why this priority**: Sin cierre, los ausentes quedan sin estado y el reporte del curso queda incompleto.

**Independent Test**: Abrir una sesión de 30 alumnos, registrar 25 y cerrar; verificar que los 5 restantes quedan como Falta y que cerrar dos veces no las duplica.

**Acceptance Scenarios**:

1. **Given** una sesión abierta con 25 de 30 alumnos registrados, **When** el Docente la cierra, **Then** ve la lista de presentes y ausentes.
2. **Given** la lista de ausentes, **When** el Docente confirma, **Then** los ausentes quedan como "Falta" en ese curso.
3. **Given** una sesión cerrada, **When** se intenta registrar a un alumno, **Then** el sistema lo rechaza con un mensaje claro.

---

### User Story 3 - Restringir la asistencia al curso asignado (Priority: P1)

El Docente sólo puede abrir sesiones de los cursos que tiene asignados y en su sección.

**Why this priority**: Evita que un Docente altere la asistencia de cursos que no dicta.

**Independent Test**: Iniciar sesión como Docente de 3ro B e intentar abrir una sesión de 4to A; verificar que no aparece como opción.

**Acceptance Scenarios**:

1. **Given** un Docente con cursos asignados, **When** abre el registro de aula, **Then** sólo ve sus cursos y secciones.
2. **Given** un curso ajeno, **When** el Docente intenta acceder por enlace directo, **Then** el sistema lo impide.

---

### Edge Cases

- Docente sin cursos asignados: la pantalla de aula muestra un aviso y no permite abrir sesiones.
- Sesión abierta y olvidada: se cierra automáticamente al terminar el bloque horario y se marcan las faltas.
- Escaneo de un alumno dado de baja: se rechaza.
- Credencial revocada: se rechaza y se indica al Docente que el alumno debe pasar por dirección.
- Dos Docentes abren sesión del mismo curso a la vez: sólo una queda activa y la otra se rechaza.
- Sesión abierta sin conexión: se registra localmente igual que en puerta y se sincroniza al volver la red.
- Registro sincronizado después del cierre de sesión: la falta se convierte en puntual o tardanza y queda rastro en auditoría.
- Cierre automático por fin de bloque: las sesiones abiertas se cierran y las faltas se generan con la hora del bloque.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El Docente MUST seleccionar grado, sección y curso antes de registrar; el sistema MUST mostrar sólo sus cursos asignados.
- **FR-002**: El Docente MUST poder abrir y cerrar la sesión de su curso.
- **FR-003**: El sistema MUST registrar la asistencia escaneando la credencial impresa del alumno.
- **FR-004**: El sistema MUST rechazar credenciales de alumnos de otra sección, de alumnos dados de baja y credenciales revocadas.
- **FR-005**: El sistema MUST calcular el estado como "Puntual" o "Tardanza" según la hora de inicio de la sesión y su tolerancia.
- **FR-006**: El sistema MUST impedir un segundo registro del mismo alumno en la misma sesión dentro de la ventana de enfriamiento del curso.
- **FR-007**: La ventana de enfriamiento de cada curso MUST ser independiente de la de puerta y de la de otros cursos.
- **FR-008**: Registrar en puerta MUST NOT impedir ni sustituir el registro de aula del mismo alumno.
- **FR-009**: Al cerrar la sesión, el Docente MUST ver presentes y ausentes y MUST poder marcar a los ausentes como "Falta".
- **FR-010**: El sistema MUST rechazar registros en una sesión cerrada.
- **FR-011**: El sistema MUST registrar como máximo una asistencia por alumno y por sesión.
- **FR-012**: El sistema MUST permitir registrar aunque no haya conexión, guardando el evento en el dispositivo.
- **FR-013**: El sistema MUST NOT requerir teléfono, cuenta ni aplicación en el dispositivo del alumno.
- **FR-014**: El sistema MUST cerrar automáticamente las sesiones abiertas al terminar el bloque horario (`hora_inicio + duracion_bloque_min`).
- **FR-015**: Si una credencial se registra después de que el cierre de sesión marcó falta, el sistema MUST actualizar esa fila con la asistencia real, sin rechazar el evento ni crear una segunda fila, y MUST dejar constancia en auditoría del estado anterior.
- **FR-016**: Una entrada de aula MUST NOT actualizar ni borrar la asistencia de puerta del mismo alumno.
- **FR-017**: La asistencia de aula MUST ser propiedad del Docente de ese curso y MUST registrarse de forma independiente de la asistencia de puerta. Un Docente MUST NOT ver ni incluir registros de puerta en sus listas, reportes o métricas.
- **FR-018**: El Docente MUST poder generar sus propios reportes de asistencia limitados a los cursos que dicta; el reporte MUST indicar el curso y MUST NOT mezclar el nivel de puerta.

### Key Entities

- **Sesión de clase**: Curso, fecha, hora de apertura, hora de cierre, estado (abierta, cerrada), Docente.
- **Asistencia de Curso**: Alumno, curso, sesión, fecha, hora, estado (Puntual, Tardanza, Falta, Justificado), método (credencial), dispositivo de escaneo.
- **Cierre de sesión**: Lista de presentes, lista de ausentes, faltas generadas y usuario que cerró.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un Docente registra la asistencia de 35 alumnos en menos de 3 minutos.
- **SC-002**: El 100% de los alumnos de otra sección se rechaza y el 0% de los alumnos de la sección se rechaza por error.
- **SC-003**: Cerrar una sesión de 35 alumnos y marcar faltas tarda menos de 1 minuto.
- **SC-004**: El 100% de los registros de aula se crea aunque el alumno tenga entrada registrada en puerta el mismo día.
- **SC-005**: Ningún alumno queda con más de una asistencia por sesión.

## Assumptions

- El Docente usa su laptop o su celular; el alumno sólo presenta su credencial impresa.
- Cada curso tiene un horario y una tolerancia configurados en `002`.
- Las faltas de aula se generan al cerrar la sesión y no dependen del cierre de jornada de puerta.
- El Docente puede marcar faltas manualmente al cerrar la sesión.
- Las justificaciones se gestionan en `006` y pueden cambiar una falta de aula a Justificado.
