# Feature Specification: Gestión académica y cuentas

**Feature Branch**: `002-gestion-academica`

**Created**: 2026-11-17

**Status**: Draft

**Input**: Módulo 1 de la spec padre [`001-asistencia-qr-escolar`](../001-asistencia-qr-escolar/spec.md): "Administrador: crea y administra cuentas de Docentes y Auxiliares de puerta, configura grados, secciones, cursos, horarios generales y por curso".

**Trazabilidad**: los identificadores `FR-###` y `SC-###` son locales. Fuera de esta spec se citan como `002/FR-###`.

## Alcance

Configura la estructura de la institución y el acceso del personal: cuentas, roles, grados, secciones, cursos, turnos, horarios y auditoría administrativa. No incluye alumnos ni asistencia.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Crear y administrar cuentas del personal (Priority: P1)

El Administrador da de alta las cuentas de Docentes y Auxiliares de Puerta, asigna su rol y las desactiva cuando alguien deja la institución.

**Why this priority**: Sin cuentas no hay acceso al sistema ni responsable identificable de cada registro.

**Independent Test**: Crear una cuenta de Docente, iniciar sesión con ella, desactivarla y verificar que ya no puede entrar.

**Acceptance Scenarios**:

1. **Given** un Administrador autenticado, **When** crea una cuenta con rol Docente, **Then** la cuenta queda activa y puede iniciar sesión.
2. **Given** una cuenta activa, **When** el Administrador la desactiva, **Then** no puede iniciar sesión y sus registros previos se conservan.
3. **Given** un Docente, **When** intenta crear una cuenta, **Then** el sistema lo impide.

---

### User Story 2 - Configurar grados, secciones y cursos (Priority: P1)

El Administrador define los grados, sus secciones y los cursos que se dictan en cada sección, y asigna cada curso a un Docente.

**Why this priority**: La asistencia de aula y los reportes se organizan por esta estructura.

**Independent Test**: Crear el grado "3ro" con secciones A y B, asignar el curso "Matemática" a 3ro B y a un Docente, y verificar que el Docente sólo ve ese curso.

**Acceptance Scenarios**:

1. **Given** el Administrador, **When** crea un grado con dos secciones, **Then** ambas quedan disponibles para el padrón y los cursos.
2. **Given** un curso asignado a un Docente, **When** ese Docente inicia sesión, **Then** ve el curso y su sección.
3. **Given** un curso sin Docente asignado, **When** se consulta la estructura, **Then** el sistema lo señala como pendiente de asignación.

---

### User Story 3 - Configurar turnos y horarios (Priority: P1)

El Administrador configura los turnos mañana y tarde, asigna cada grado a un turno y define su hora de entrada y tolerancia. También define la hora de inicio, la duración del bloque y la tolerancia de cada curso.

**Why this priority**: El estado Puntual o Tardanza de puerta y de aula depende de estos tiempos.

**Independent Test**: Asignar 3ro al turno mañana con entrada 07:30 y tolerancia 10 minutos, y verificar que un escaneo a las 07:35 es Puntual y a las 07:45 es Tardanza.

**Acceptance Scenarios**:

1. **Given** un grado sin turno, **When** el Administrador lo asigna al turno mañana con hora de entrada, **Then** el horario queda vigente para ese grado.
2. **Given** un curso con hora de inicio 08:00 y tolerancia 5 minutos, **When** el Docente abre la sesión a las 08:10, **Then** el sistema registra la sesión fuera de tolerancia.
3. **Given** un curso con hora de inicio 08:00 y duración de 45 minutos, **When** se consulta su bloque, **Then** el sistema lo ubica de 08:00 a 08:45 y lo usa para detectar solapamientos y cerrar la sesión.
4. **Given** un cambio de horario a mitad de año, **When** se guarda, **Then** los registros anteriores conservan el estado calculado con el horario vigente en su momento.

---

### User Story 4 - Auditar acciones administrativas (Priority: P2)

El Administrador consulta quién creó cuentas, cambió horarios o modificó la estructura, con fecha y detalle.

**Why this priority**: Permite responder ante la dirección y detectar cambios indebidos.

**Independent Test**: Cambiar el horario de un grado, consultar la auditoría y verificar el usuario, la fecha y el valor anterior.

**Acceptance Scenarios**:

1. **Given** un cambio de horario, **When** se guarda, **Then** queda un evento de auditoría con usuario, fecha, valor anterior y valor nuevo.
2. **Given** una consulta de auditoría, **When** se filtra por usuario y fecha, **Then** se muestran sólo los eventos correspondientes.

---

### Edge Cases

- Se intenta crear una cuenta con un nombre de usuario ya existente: se rechaza con un mensaje claro.
- Se desactiva un Docente con sesiones de aula abiertas: las sesiones se cierran y no se pueden reabrir sin un Docente activo asignado.
- Se intenta eliminar una sección con alumnos y registros: no se permite; sólo se desactiva.
- Se cambia el Docente de un curso a mitad de periodo: los registros previos conservan al Docente anterior.
- Se asigna un Docente a dos cursos que se dictan a la misma hora en secciones distintas: el sistema advierte el conflicto.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El Administrador MUST poder crear, editar, desactivar y reactivar cuentas de Docentes y Auxiliares de Puerta.
- **FR-002**: Cada cuenta MUST tener un rol único: Administrador, Auxiliar de Puerta o Docente.
- **FR-003**: El sistema MUST impedir que un Docente o Auxiliar de Puerta modifique cuentas o la estructura académica.
- **FR-004**: El Administrador MUST poder crear grados y secciones, y desactivarlos sin borrar registros existentes.
- **FR-005**: El Administrador MUST poder crear cursos, asignarlos a una sección y a un Docente.
- **FR-006**: El Docente MUST ver sólo los cursos y secciones que tiene asignados.
- **FR-007**: El Administrador MUST poder configurar los turnos mañana y tarde y asignar cada grado a un turno.
- **FR-008**: El Administrador MUST poder configurar, por grado, la hora de entrada y la tolerancia para Tardanza.
- **FR-009**: El Administrador MUST poder configurar, por curso, la hora de inicio, la duración del bloque y la tolerancia de la sesión. La duración es la base para detectar solapamientos y cerrar sesiones olvidadas.
- **FR-010**: El sistema MUST advertir cuando un Docente queda asignado a cursos con horarios que se solapan.
- **FR-011**: Desactivar una cuenta, grado, sección o curso MUST conservar todos los registros históricos asociados.
- **FR-012**: Cada acción administrativa MUST quedar registrada en auditoría con usuario, fecha, acción, valor anterior y valor nuevo.
- **FR-013**: El sistema MUST permitir consultar la auditoría filtrando por usuario y rango de fechas.
- **FR-014**: Los cambios de horario MUST aplicarse sólo a los registros posteriores; los anteriores MUST conservar el estado calculado.
- **FR-015**: El Administrador MUST poder restablecer la contraseña de una cuenta generando una contraseña temporal; el usuario MUST cambiarla en el siguiente ingreso.
- **FR-016**: El sistema MUST impedir desactivar al último Administrador activo.
- **FR-017**: El Administrador MUST poder configurar los parámetros operativos: ventana de enfriamiento de puerta, desfase de reloj tolerado y retención de datos.
- **FR-018**: El sistema MUST permitir exportar el historial de un periodo antes de aplicar la retención y MUST NOT eliminar registros sin que el Administrador lo confirme.

### Key Entities

- **Usuario**: Cuenta con nombre, nombre de usuario, rol, estado (activo, inactivo) y fecha de alta.
- **Grado**: Nivel educativo (por ejemplo, 3ro), con turno y horario de entrada.
- **Sección**: División de un grado (por ejemplo, A, B), con estado.
- **Curso**: Materia dictada a una sección por un Docente, con hora de inicio, duración del bloque y tolerancia.
- **Turno**: Mañana o tarde.
- **Horario de grado**: Hora de entrada y tolerancia por grado.
- **Horario de curso**: Hora de inicio, duración del bloque y tolerancia por curso.
- **Evento de auditoría**: Usuario, fecha, acción, valor anterior y valor nuevo.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El Administrador configura un grado con dos secciones, tres cursos y sus horarios en menos de 10 minutos.
- **SC-002**: El 100% de los cambios administrativos aparece en la auditoría con usuario, fecha y detalle.
- **SC-003**: Un Docente ve el 100% de sus cursos asignados y el 0% de los ajenos en las pruebas de permisos.
- **SC-004**: Desactivar una cuenta corta el acceso en menos de 1 minuto.
- **SC-005**: Restablecer una contraseña tarda menos de 2 minutos y el 100% de los usuarios con clave temporal debe cambiarla en el siguiente ingreso.
- **SC-006**: El 100% de los intentos de desactivar al último Administrador activo se bloquea.
- **SC-007**: Un cambio de parámetro operativo se aplica al sistema en menos de 1 minuto, sin despliegue.
- **SC-008**: El 100% de los solapamientos entre cursos de un mismo Docente se detecta con la duración de bloque configurada.
- **SC-009**: La exportación previa a la retención contiene el 100% de los registros del periodo y ningún registro se elimina sin confirmación.

## Assumptions

- Un Docente puede dictar varios cursos en varias secciones.
- Un curso pertenece a una sola sección.
- Los turnos son exactamente dos: mañana y tarde.
- El Administrador no dicta clases de forma habitual; su acceso a registro es de contingencia.
- La estructura se crea antes de cargar el padrón.
- No hay envío de correos ni mensajes: el restablecimiento de contraseña lo hace el Administrador y entrega la contraseña temporal en persona.
- La duración de bloque por defecto es de 45 minutos y se configura por curso.
