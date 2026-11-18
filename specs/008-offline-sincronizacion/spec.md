# Feature Specification: Operación Offline-First y sincronización

**Feature Branch**: `008-offline-sincronizacion`

**Created**: 2026-11-17

**Status**: Draft

**Input**: Módulo 7 de la spec padre [`001-asistencia-qr-escolar`](../001-asistencia-qr-escolar/spec.md): "Almacenamiento local en IndexedDB (Dexie.js) ... escanear sin interrupciones y sincronizar en lote al recuperar red".

**Trazabilidad**: los identificadores `FR-###` y `SC-###` son locales. Fuera de esta spec se citan como `008/FR-###`.

## Alcance

Permite registrar asistencia sin conexión y sincronizar los eventos al recuperar la red, sin pérdidas ni duplicados. Aplica a puerta y aula. No define la interfaz de escaneo ni las reglas de estado.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Registrar sin conexión (Priority: P1)

El Auxiliar o el Docente registra escaneos sin red. La confirmación en pantalla es inmediata y los eventos quedan en cola.

**Why this priority**: Hay aulas sin cobertura y la puerta pierde señal en hora punta.

**Independent Test**: Desconectar el dispositivo, registrar 200 eventos y verificar que todos quedan guardados localmente con su hora original.

**Acceptance Scenarios**:

1. **Given** un dispositivo sin conexión, **When** se registra un escaneo, **Then** la confirmación es inmediata y el evento queda en cola.
2. **Given** 200 eventos sin conexión, **When** se cierra la aplicación y se vuelve a abrir, **Then** los eventos siguen en cola.
3. **Given** un evento en cola, **When** la hora del dispositivo difiere de la del servidor en más de 5 minutos, **Then** el evento se marca para revisión al sincronizar.

---

### User Story 2 - Sincronizar en lote al volver la red (Priority: P1)

Al recuperar la conexión, el dispositivo envía todos los eventos pendientes en lote y el contador llega a cero.

**Why this priority**: Si la sincronización falla o duplica, los reportes y las faltas quedan incorrectos.

**Independent Test**: Registrar 1,000 eventos sin conexión, reconectar y verificar que el servidor recibe exactamente 1,000 sin duplicados.

**Acceptance Scenarios**:

1. **Given** eventos en cola y red disponible, **When** se inicia la sincronización, **Then** se envían en lote y el contador llega a cero.
2. **Given** un evento enviado dos veces por un reintento, **When** el servidor lo recibe, **Then** lo guarda una sola vez.
3. **Given** un fallo del servidor, **When** falla la sincronización, **Then** el evento permanece en cola y se reintenta sin pérdida.

---

### User Story 3 - Resolver conflictos entre dispositivos (Priority: P2)

Dos dispositivos registran al mismo alumno sin conexión. Al sincronizar, el sistema conserva el primer evento válido y deja constancia del descartado.

**Why this priority**: Evita duplicados y permite explicar los descartes.

**Independent Test**: Registrar al mismo alumno desde dos dispositivos en la misma ventana y verificar un solo evento válido y un descarte registrado.

**Acceptance Scenarios**:

1. **Given** dos eventos del mismo alumno y contexto dentro de la ventana de enfriamiento, **When** se sincronizan, **Then** se conserva uno y se registra el otro como descartado.
2. **Given** el mismo alumno en puerta y en aula, **When** se sincronizan, **Then** ambos eventos se conservan.

---

### User Story 4 - Ver el estado de sincronización (Priority: P2)

La barra superior muestra si el dispositivo está en línea y sincronizado o en modo offline con registros en cola.

**Why this priority**: El operador necesita saber si puede cerrar la aplicación sin perder datos.

**Independent Test**: Desconectar la red y verificar que el indicador cambia a modo offline con el número de pendientes.

**Acceptance Scenarios**:

1. **Given** conexión y sin pendientes, **When** se muestra la barra, **Then** dice "En línea (Sincronizado)" en verde esmeralda.
2. **Given** sin conexión o con pendientes, **When** se muestra la barra, **Then** dice "Modo Offline (Registros en cola)" en ámbar con el número.
3. **Given** un cambio de conectividad, **When** ocurre, **Then** el indicador cambia en menos de 2 segundos.

---

### Edge Cases

- Almacenamiento local lleno: se avisa y no se descartan eventos pendientes.
- Cierre de sesión con eventos pendientes: se advierte y no se borran sin confirmar la sincronización.
- Reloj del dispositivo muy desfasado: el evento se marca para revisión y se conserva la hora original.
- Evento corrupto en la cola: se marca como fallido, se conserva para revisión y no bloquea el resto del lote.
- Sincronización interrumpida a mitad del lote: los eventos no confirmados se reenvían y los confirmados no se duplican.
- Evento sincronizado después del cierre de jornada o de sesión: se reconcilia con la fila existente y se devuelve `reconciliado`.
- Evento marcado para revisión que el Administrador anula: la asistencia vuelve a su estado anterior y la anulación queda en auditoría.
- Varios dispositivos del mismo usuario: cada uno mantiene su propia cola.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El Auxiliar de Puerta y el Docente MUST poder registrar asistencia sin conexión, con confirmación inmediata en pantalla.
- **FR-002**: Cada escaneo MUST guardarse localmente con su hora original antes de intentar enviarse.
- **FR-003**: Los eventos MUST conservarse aunque se cierre o reinicie la aplicación.
- **FR-004**: El sistema MUST sincronizar automáticamente al recuperar la conexión y MUST permitir iniciarla manualmente.
- **FR-005**: La sincronización MUST ser en lote.
- **FR-006**: Cada evento MUST tener un identificador único generado en el dispositivo; el servidor MUST guardar una sola vez un evento repetido.
- **FR-007**: Un fallo de sincronización MUST NOT eliminar el evento de la cola; se reintenta.
- **FR-008**: El sistema MUST mostrar el número de eventos pendientes, el último estado de sincronización y el último error cuando exista.
- **FR-009**: La barra superior MUST mostrar "En línea (Sincronizado)" en verde esmeralda o "Modo Offline (Registros en cola)" en ámbar con el número de pendientes.
- **FR-010**: Un cambio de conectividad MUST reflejarse en el indicador en menos de 2 segundos.
- **FR-011**: Ante eventos del mismo alumno y contexto dentro de la ventana de enfriamiento, el sistema MUST conservar uno solo y registrar el descartado.
- **FR-012**: Los registros de puerta y de aula MUST tratarse como contextos distintos y no deben descartarse entre sí.
- **FR-013**: El sistema MUST registrar la hora del servidor al recibir cada evento y marcar para revisión los que difieran más del umbral configurable de desfase de reloj (5 minutos por defecto, `002/FR-017`).
- **FR-014**: Un evento local MUST NOT borrarse hasta confirmar su recepción por el servidor, salvo autorización explícita del Administrador.
- **FR-015**: El sistema MUST avisar cuando el almacenamiento local se esté llenando y MUST NOT descartar eventos pendientes.
- **FR-016**: Al cerrar sesión con eventos pendientes, el sistema MUST advertir y MUST NOT borrar datos sin confirmar la sincronización.
- **FR-017**: El Administrador MUST disponer de una bandeja de eventos marcados para revisión, con alumno, contexto, hora del dispositivo, hora del servidor y acción para aceptarlos o anularlos.
- **FR-018**: Cuando el servidor aplique un evento sobre una fila existente de permiso o de cierre, MUST devolver `reconciliado` (no `duplicado`) y eliminar el evento de la cola como aplicado.

### Key Entities

- **Evento pendiente**: Identificador local, tipo, datos del registro, hora del dispositivo, estado (pendiente, enviado, fallido) e intentos.
- **Cola de sincronización**: Conjunto de eventos pendientes de un dispositivo, con fecha de último envío y último error.
- **Evento descartado**: Evento recibido que no se aplicó por la regla de debounce, conservado para auditoría.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: El 100% de los eventos registrados sin conexión se sincroniza al recuperar la red, verificado con 1,000 eventos.
- **SC-002**: La sincronización no genera duplicados en el 100% de los reintentos.
- **SC-003**: La confirmación en pantalla sin conexión ocurre en menos de 1 segundo.
- **SC-004**: El contador de pendientes coincide con los eventos reales en el 100% de las pruebas.
- **SC-005**: El indicador de conexión cambia en menos de 2 segundos en el 100% de las pruebas.
- **SC-006**: Ningún evento pendiente se pierde al cerrar o reiniciar la aplicación.

## Assumptions

- Cada dispositivo mantiene su propia cola local; no se comparte entre dispositivos.
- La sincronización automática se intenta al detectar conexión y de forma periódica mientras la aplicación está abierta.
- El servidor es la autoridad para decidir el evento descartado.
- La aplicación puede funcionar un día completo sin conexión.
- Los datos locales se limitan a los eventos pendientes y al padrón necesario para reconocer credenciales.
