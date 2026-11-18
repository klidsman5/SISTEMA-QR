# Feature Specification: Asistencia de puerta

**Feature Branch**: `004-asistencia-puerta`

**Created**: 2026-11-17

**Status**: Draft

**Input**: Módulo 3 de la spec padre [`001-asistencia-qr-escolar`](../001-asistencia-qr-escolar/spec.md): "Nivel 1 - Puerta Principal (Auxiliar): Escaneo rápido de Entrada y Salida general" — ajustado: sólo se registra la entrada.

**Trazabilidad**: los identificadores `FR-###` y `SC-###` son locales. Fuera de esta spec se citan como `004/FR-###`.

## Alcance

Registro de entrada en la puerta principal, cálculo de Puntual o Tardanza, prevención de duplicados, cierre de jornada y consulta de los registros del día por el Auxiliar. No incluye salidas, retiros anticipados ni asistencia de aula.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar la entrada de un alumno (Priority: P1)

El Auxiliar de Puerta escanea la credencial del alumno al entrar. El sistema muestra nombre, grado, sección, hora y estado.

**Why this priority**: Es el control diario de los 1,000 alumnos y la base del reporte institucional.

**Independent Test**: Escanear una credencial válida dentro del horario de entrada y verificar que se registra la entrada con el estado correcto y la confirmación en pantalla.

**Acceptance Scenarios**:

1. **Given** un alumno activo con credencial válida y hora dentro de la tolerancia, **When** el Auxiliar escanea, **Then** se registra la entrada como "Puntual".
2. **Given** hora posterior a la tolerancia, **When** el Auxiliar escanea, **Then** la entrada queda como "Tardanza".
3. **Given** una credencial revocada o un código desconocido, **When** se escanea, **Then** el sistema lo rechaza sin crear el evento.

---

### User Story 2 - Evitar registros duplicados (Priority: P1)

El Auxiliar no puede registrar dos veces al mismo alumno por un doble escaneo accidental, y un registro de puerta no bloquea el registro del aula.

**Why this priority**: Los duplicados inflan la asistencia y confunden los reportes.

**Independent Test**: Escanear dos veces al mismo alumno en 2 minutos y verificar que el segundo intento no crea evento; luego registrarlo en un curso y verificar que sí se crea.

**Acceptance Scenarios**:

1. **Given** un alumno ya registrado en puerta hace 2 minutos, **When** se vuelve a escanear, **Then** no se crea un segundo evento y se avisa del duplicado.
2. **Given** un alumno registrado en puerta, **When** el Docente lo registra en su curso, **Then** el registro de aula se crea con normalidad.
3. **Given** un alumno con entrada ya registrada hoy, **When** se escanea otra vez el mismo día, **Then** el sistema informa que la entrada del día ya existe.

---

### User Story 3 - Cerrar la jornada y asignar faltas (Priority: P2)

Al terminar el turno, el Administrador o un proceso programado cierra la jornada. Los alumnos sin entrada quedan como "Falta", salvo los justificados.

**Why this priority**: Completa la asistencia diaria sin depender de que alguien revise uno por uno.

**Independent Test**: Con 1,000 alumnos y 20 sin entrada, ejecutar el cierre y verificar que sólo esos 20 quedan como Falta, dos veces sin duplicar.

**Acceptance Scenarios**:

1. **Given** un alumno activo sin entrada en el día, **When** se ejecuta el cierre, **Then** queda como "Falta".
2. **Given** un alumno con permiso previo aprobado, **When** se ejecuta el cierre, **Then** queda como "Justificado" y no como Falta.
3. **Given** el cierre ya ejecutado, **When** se ejecuta otra vez, **Then** no se duplican faltas.
4. **Given** dispositivos con eventos pendientes de sincronizar, **When** se intenta cerrar, **Then** el sistema advierte antes de asignar faltas.

---

### User Story 4 - Consultar los registros del día (Priority: P2)

El Auxiliar consulta qué alumnos registraron entrada hoy y cuáles no, para atender la puerta.

**Why this priority**: Permite resolver dudas en el momento sin esperar un reporte.

**Independent Test**: Consultar el listado del día y verificar que coincide con los escaneos realizados por ese Auxiliar.

**Acceptance Scenarios**:

1. **Given** escaneos del día, **When** el Auxiliar consulta, **Then** ve la lista con hora y estado de cada alumno.
2. **Given** un alumno sin entrada, **When** el Auxiliar lo busca, **Then** el sistema indica que no tiene entrada registrada hoy.

---

### Edge Cases

- Alumno sin credencial: el Auxiliar lo busca por código o nombre y registra con motivo; queda marcado como registro manual.
- Credencial de un alumno dado de baja: se rechaza el registro.
- Escaneo fuera del horario del turno: se registra con el estado que corresponda y se marca la anomalía.
- Dos Auxiliares escanean al mismo alumno en la misma ventana: se conserva el primer evento y se registra el descartado.
- Cierre de jornada con el turno de la tarde aún abierto: cada turno se cierra por separado.
- Entrada sincronizada después del cierre de jornada: la falta del día se convierte en puntual o tardanza, dejando rastro en auditoría.
- Alumno con permiso previo que sí llega: la entrada reemplaza el estado justificado del día.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El Auxiliar de Puerta MUST poder registrar la entrada escaneando la credencial QR del alumno.
- **FR-002**: Cada registro MUST guardar fecha, hora exacta del dispositivo, alumno, nivel "Puerta" y estado calculado.
- **FR-003**: El sistema MUST calcular el estado como "Puntual" o "Tardanza" según la hora de entrada y la tolerancia del grado del alumno.
- **FR-004**: El sistema MUST registrar únicamente entradas; no existen eventos de salida ni retiros anticipados.
- **FR-005**: El sistema MUST impedir un segundo registro del mismo alumno en puerta dentro de la ventana de enfriamiento de 5 minutos.
- **FR-006**: El sistema MUST registrar como máximo una entrada por alumno por día.
- **FR-007**: La ventana de enfriamiento de puerta MUST ser independiente de la de cada curso.
- **FR-008**: El sistema MUST permitir el cierre de jornada programado por turno y manual por el Administrador.
- **FR-009**: El cierre MUST asignar "Falta" a todo alumno activo del turno sin entrada registrada, excepto los que tengan permiso o justificación aprobada.
- **FR-010**: El cierre MUST ser idempotente: repetirlo no duplica faltas.
- **FR-011**: Antes del cierre, el sistema MUST advertir si hay eventos pendientes de sincronizar.
- **FR-012**: El Auxiliar MUST poder consultar los registros de puerta del día.
- **FR-013**: El sistema MUST permitir el registro manual cuando el alumno no tiene credencial, exigiendo motivo.
- **FR-014**: El sistema MUST rechazar credenciales revocadas, de alumnos dados de baja y códigos desconocidos.
- **FR-015**: Cada registro de puerta MUST respetar el alcance del rol: el Auxiliar ve los registros de puerta, no los de aula.
- **FR-016**: Cuando llegue una entrada para un alumno que ya tiene una fila del día creada por un permiso previo o por el cierre de jornada, el sistema MUST actualizar esa fila con la hora y el estado de la entrada real, sin crear una segunda fila ni rechazar el evento.
- **FR-017**: La reconciliación MUST conservar en auditoría el estado anterior (`justificado` o `falta`) y el motivo del cambio.

### Key Entities

- **Asistencia de Puerta**: Alumno, fecha, hora del dispositivo, hora del servidor, estado (Puntual, Tardanza, Falta, Justificado), dispositivo, usuario que registró, origen (escaneo o manual) y motivo si es manual.
- **Cierre de jornada**: Turno, fecha, ejecutado por (sistema o Administrador), alumnos marcados como Falta, alumnos exceptuados.
- **Registro manual**: Entrada registrada sin credencial, con motivo y usuario.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un escaneo confirmado tarda menos de 2 segundos con red y menos de 1 segundo sin conexión.
- **SC-002**: El sistema procesa 1,000 entradas en 15 minutos sin pérdida de registros.
- **SC-003**: El 100% de los escaneos repetidos en la misma ventana se bloquea y el 0% de los registros de aula se bloquea por un registro previo de puerta.
- **SC-004**: El cierre de 1,000 alumnos termina en menos de 1 minuto y no duplica faltas al ejecutarse dos veces.
- **SC-005**: El 100% de las entradas muestra en pantalla nombre, grado, sección, hora y estado.

## Assumptions

- Cada alumno pertenece a un turno por medio de su grado.
- La tolerancia por defecto es de 10 minutos y se configura por grado.
- El cierre se ejecuta por turno.
- Las faltas del día se generan una sola vez por alumno.
- Los permisos previos del módulo `006` se respetan en el cierre.
