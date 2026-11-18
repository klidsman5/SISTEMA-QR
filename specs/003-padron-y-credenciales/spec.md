# Feature Specification: Padrón y credenciales

**Feature Branch**: `003-padron-y-credenciales`

**Created**: 2026-11-17

**Status**: Draft

**Input**: Módulo 2 de la spec padre [`001-asistencia-qr-escolar`](../001-asistencia-qr-escolar/spec.md): "realiza la carga masiva de estudiantes (CSV/Excel), genera credenciales QR masivas".

**Trazabilidad**: los identificadores `FR-###` y `SC-###` son locales. Fuera de esta spec se citan como `003/FR-###`.

## Alcance

Administra el padrón de alumnos y sus credenciales QR: importación masiva, validación, generación de carnets, revocación y reemisión, bajas y ciclo anual. No incluye el registro de asistencia.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Carga masiva del padrón (Priority: P1)

El Administrador importa un archivo CSV o Excel con los alumnos. El sistema valida cada fila, genera la credencial de los alumnos válidos y reporta los errores por fila antes de confirmar.

**Why this priority**: Sin padrón no se puede registrar asistencia.

**Independent Test**: Importar 1,000 filas con 10 errores y verificar que se crean 990 alumnos con credencial y que las 10 filas erróneas se reportan con su motivo.

**Acceptance Scenarios**:

1. **Given** un .xlsx con 1,000 filas válidas, **When** el Administrador lo importa, **Then** se crean 1,000 alumnos con credencial en menos de 2 minutos.
2. **Given** una fila sin código/DNI, nombres, apellidos, grado o sección, **When** se valida, **Then** la fila se marca como error y no se crea el alumno.
3. **Given** un código/DNI ya existente, **When** se importa, **Then** el sistema lo reporta como duplicado y no crea un segundo alumno.
4. **Given** un CSV UTF-8 con acentos, **When** se importa, **Then** los nombres se guardan sin pérdida de caracteres.

---

### User Story 2 - Generar e imprimir carnets en lote (Priority: P2)

El Administrador genera un PDF con los carnets de un grado o sección, cada uno con nombre, grado, sección, código y QR.

**Why this priority**: Las credenciales impresas son el medio de identificación del alumno en puerta y aula.

**Independent Test**: Generar el PDF de 3ro B y verificar que tiene exactamente los alumnos de esa sección y que cada QR identifica al alumno correcto.

**Acceptance Scenarios**:

1. **Given** un grado y sección, **When** se solicita el PDF, **Then** se genera un carnet por alumno de esa sección.
2. **Given** los 1,000 alumnos, **When** se genera el lote completo, **Then** el sistema lo procesa sin bloquear a otros usuarios.
3. **Given** un alumno sin foto, **When** se genera su carnet, **Then** el carnet muestra sus datos y QR sin foto.

---

### User Story 3 - Revocar y reemitir una credencial (Priority: P2)

Cuando un alumno pierde su credencial, el Administrador la revoca y emite una nueva. La anterior deja de servir de inmediato.

**Why this priority**: Una credencial perdida en manos ajenas podría usarse para registrar asistencia por otro alumno.

**Independent Test**: Revocar una credencial, escanear la anterior y verificar que el sistema la rechaza; escanear la nueva y verificar que registra.

**Acceptance Scenarios**:

1. **Given** una credencial vigente, **When** el Administrador la revoca, **Then** deja de aceptar registros.
2. **Given** una credencial revocada, **When** se escanea, **Then** el sistema muestra un error claro y no crea el evento.
3. **Given** una credencial reemitida, **When** se generan carnets, **Then** el nuevo carnet usa el nuevo QR.

---

### User Story 4 - Ciclo anual del padrón (Priority: P2)

Al comenzar el año, el Administrador carga el padrón nuevo. El sistema actualiza grado y sección, conserva la identidad e historial por código/DNI, da de baja a quienes no aparecen y emite credenciales nuevas.

**Why this priority**: El colegio cambia de año cada ciclo y el historial debe sobrevivir al cambio.

**Independent Test**: Cargar un padrón nuevo donde un alumno cambia de sección y otro no aparece; verificar que el primero conserva su historial con el grado anterior y el segundo queda de baja con credencial revocada.

**Acceptance Scenarios**:

1. **Given** un padrón del año anterior, **When** se carga el padrón nuevo, **Then** los alumnos existentes conservan identidad e historial y actualizan grado y sección.
2. **Given** un alumno que no aparece en el padrón nuevo, **When** se confirma la carga, **Then** queda de baja y su credencial anterior queda revocada.
3. **Given** el padrón nuevo confirmado, **When** se abren los carnets, **Then** todos los alumnos activos tienen credencial del año vigente.

---

### Edge Cases

- Archivo con columnas faltantes: se rechaza el archivo completo con la lista de columnas obligatorias.
- Archivo con más de 1,000 filas: se procesa en lotes y se informa el total.
- Alumno trasladado durante el año: se da de baja y su credencial se revoca; su historial se conserva.
- Alumno que cambia de sección a mitad de año: el historial conserva la sección en que ocurrió cada registro.
- Importación interrumpida a mitad: no se crea ningún alumno parcial; la carga se confirma sólo al finalizar la validación.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST importar alumnos desde CSV y Excel (.xlsx) con las columnas obligatorias: código/DNI, nombres, apellidos, grado y sección.
- **FR-002**: El sistema MUST validar cada fila y reportar los errores por fila con el campo que falta, sin crear filas incompletas.
- **FR-003**: El sistema MUST impedir duplicados por código/DNI y reportarlos explícitamente.
- **FR-004**: El sistema MUST generar para cada alumno nuevo un QR único y no predecible que no contenga datos personales.
- **FR-005**: Cada alumno MUST tener una sola credencial vigente a la vez.
- **FR-006**: El sistema MUST permitir generar un PDF de carnets filtrado por grado y/o sección, con nombre, grado, sección, código y QR.
- **FR-007**: El Administrador MUST poder revocar y reemitir credenciales; una credencial revocada MUST dejar de registrar asistencias.
- **FR-008**: El Administrador MUST poder dar de baja a un alumno sin borrar su historial.
- **FR-009**: El sistema MUST permitir la carga anual del padrón en lote, conservando la identidad y el historial por código/DNI.
- **FR-010**: Al cargar el padrón anual, el sistema MUST actualizar grado y sección y conservar el grado y la sección de cada año en el historial.
- **FR-011**: Los alumnos que no aparecen en el padrón anual MUST quedar de baja y sus credenciales anteriores revocadas.
- **FR-012**: El sistema MUST emitir credenciales del año vigente para todos los alumnos activos e invalidar las del año anterior.
- **FR-013**: El sistema MUST aceptar archivos UTF-8 y conservar acentos y caracteres especiales.
- **FR-014**: La generación de carnets de 1,000 alumnos MUST ejecutarse sin bloquear el uso del sistema por otros usuarios.
- **FR-015**: El sistema MUST permitir incluir una foto opcional en el carnet.

### Key Entities

- **Alumno**: Código/DNI (identidad permanente), nombres, apellidos, grado y sección vigentes, estado (activo, de baja).
- **Credencial**: Valor QR único, alumno, año escolar, fecha de emisión, estado (vigente, revocada).
- **Importación**: Archivo, fecha, usuario, total de filas, filas válidas, filas con error y detalle de errores.
- **Carnet**: Representación impresa de los datos del alumno con su QR.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: La carga de 1,000 filas termina en menos de 2 minutos y reporta el 100% de los errores con su motivo.
- **SC-002**: El PDF de una sección contiene exactamente los alumnos de esa sección, con el 100% de los QR legibles.
- **SC-003**: El 100% de las credenciales revocadas deja de aceptar registros.
- **SC-004**: La carga anual conserva el 100% del historial y actualiza correctamente el grado y la sección.
- **SC-005**: Ningún alumno se crea a partir de una fila incompleta.

## Assumptions

- El código/DNI es único en la institución y no cambia entre años.
- Una sección no se elimina si tiene alumnos o historial; se desactiva.
- El carnet se imprime en papel; tamaño y diseño se definen en la planificación.
- La foto es opcional.
- La importación no crea cuentas de alumno: el alumno no inicia sesión nunca.
