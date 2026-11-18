# Feature Specification: Sistema de Asistencia Escolar por QR — Visión general

**Feature Branch**: `001-asistencia-qr-escolar` (identificador de la carpeta; el proyecto no es un repositorio git)

**Created**: 2026-11-17

**Status**: Draft

**Input**: User description: "Sistema de Asistencia Escolar por QR (1,000 alumnos) con dos niveles de control (puerta general y aula/curso), gestión administrativa y operación Offline-First"

## Propósito y alcance

Este documento es la **especificación padre**. Define el alcance del sistema, los actores, las reglas transversales y el mapa de módulos. El detalle funcional vive en las specs hijas; cada una es independiente y se puede planificar, implementar y probar por separado.

El sistema registra la asistencia de 1,000 alumnos en dos niveles: entrada en la puerta principal (Auxiliar de Puerta) y asistencia en el aula por curso (Docente). Registra **sólo entradas**; no registra salidas. No existe el actor apoderado y el sistema **no envía mensajes** a familias ni a terceros.

### Mapa de módulos (specs hijas)

| Spec | Módulo | Alcance |
|------|--------|---------|
| [`002-gestion-academica`](../002-gestion-academica/spec.md) | Gestión académica y cuentas | Usuarios, roles, grados, secciones, cursos, turnos, horarios y auditoría administrativa. |
| [`003-padron-y-credenciales`](../003-padron-y-credenciales/spec.md) | Padrón y credenciales | Carga masiva, validación, QR único, carnets PDF, revocación, ciclo anual. |
| [`004-asistencia-puerta`](../004-asistencia-puerta/spec.md) | Asistencia de puerta | Escaneo de entrada, Puntual/Tardanza, debounce, cierre de jornada. |
| [`005-asistencia-aula`](../005-asistencia-aula/spec.md) | Asistencia de aula | Sesiones de curso, escaneo de credencial, faltas al cerrar sesión. |
| [`006-justificaciones`](../006-justificaciones/spec.md) | Justificaciones | Permisos previos y justificaciones con trazabilidad. |
| [`007-reportes-dashboard`](../007-reportes-dashboard/spec.md) | Reportería y analítica | Reportes Excel/PDF y dashboard estadístico. |
| [`008-offline-sincronizacion`](../008-offline-sincronizacion/spec.md) | Offline-First | Registro local, sincronización en lote, conflictos e indicador de conexión. |

Los identificadores `FR-###` y `SC-###` son **locales a cada spec**. Para trazar una historia, usa el nombre de la spec (por ejemplo, `003/FR-004`).

## Clarifications

### Session 2026-11-17

- Q: ¿Cómo se confirma que el alumno que registra asistencia en el aula es el titular de la credencial, sin que un tercero pueda registrarla por él? → A: El alumno presenta su credencial QR impresa a la cámara de la laptop del docente, a un lector de mano o a la cámara del celular del docente abriendo la web de la aplicación; el alumno no usa teléfono en el colegio. La credencial es válida durante todo el año escolar.
- Q: Si los alumnos no usan teléfono, ¿qué debe hacer el QR de sesión que genera el docente? → A: Se elimina el QR de sesión; la asistencia de aula se toma sólo con credenciales. La sesión se abre y se cierra, y el cierre marca las faltas.
- Q: ¿El horario de salida de puerta es el mismo para todos los grados, o cada grado tiene su propia hora de salida? → A: Existen dos turnos, mañana y tarde; cada grado pertenece a un turno y tiene su propio horario de entrada. No hay horario de salida.
- Q: ¿Qué dispositivos pueden registrar asistencia en nombre del colegio? → A: Cualquier dispositivo con una cuenta válida puede escanear; no hay registro previo de dispositivos. La protección depende de la desactivación inmediata de cuentas y de la auditoría de cada registro con su dispositivo.
- Q: ¿El Administrador debe confirmar su identidad con un segundo factor al iniciar sesión? → A: No; todos los roles inician sesión sólo con contraseña. Riesgo aceptado: una contraseña robada del Administrador da control total del sistema.
- Q: Al cambiar de año escolar, ¿cómo debe actualizarse el grado y la sección de cada alumno? → A: Por lote. Se carga un padrón nuevo del año; el código/DNI mantiene la identidad y el historial; el grado y la sección se actualizan; los alumnos que no aparecen se dan de baja sin borrar su historial.
- Q: Cuando un alumno se retira antes de la hora de salida de su grado, ¿cómo debe quedar autorizada esa salida? → A: No hay registro de salida; el sistema sólo registra entradas. Los retiros anticipados no se registran en el sistema.
- Q: ¿Debe existir el actor apoderado y el envío de mensajes a las familias? → A: No. No existe el actor apoderado y el sistema no envía mensajes ni alertas a terceros. La información se consulta en el sistema por el personal autorizado.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Acceso con permisos por rol (Priority: P1)

El Administrador crea las cuentas del personal. Cada persona inicia sesión con su contraseña y ve sólo lo que su rol permite: el Administrador gestiona todo, el Auxiliar de Puerta registra entradas y el Docente registra asistencia de sus cursos.

**Why this priority**: Todo el sistema depende de que cada rol vea y haga sólo lo que le corresponde.

**Independent Test**: Iniciar sesión con cada uno de los tres roles y verificar que ninguna pantalla ni exportación muestra datos fuera de su alcance.

**Acceptance Scenarios**:

1. **Given** un Docente con cursos asignados, **When** inicia sesión, **Then** sólo ve sus cursos y secciones.
2. **Given** un Auxiliar de Puerta, **When** intenta acceder a la gestión de cuentas, **Then** el sistema lo impide.
3. **Given** una cuenta desactivada, **When** intenta iniciar sesión, **Then** el sistema rechaza el acceso.

---

### User Story 2 - Registro sin conexión en cualquier punto (Priority: P1)

El Auxiliar de Puerta y el Docente registran asistencia aunque no haya red. Los eventos se guardan en el dispositivo y se envían solos al recuperar la conexión.

**Why this priority**: Hay aulas sin cobertura y la puerta tiene Wi-Fi intermitente; sin esto el sistema no es usable.

**Independent Test**: Desconectar el dispositivo, registrar 200 eventos, reconectar y verificar que el servidor recibe exactamente 200 eventos, sin duplicados.

**Acceptance Scenarios**:

1. **Given** un dispositivo sin conexión, **When** se registra un escaneo, **Then** la confirmación es inmediata y el evento queda en cola.
2. **Given** eventos en cola, **When** vuelve la conexión, **Then** se sincronizan y el contador llega a cero.
3. **Given** el mismo evento enviado dos veces, **When** el servidor lo recibe, **Then** lo guarda una sola vez.

---

### User Story 3 - Lectura visual inmediata del estado (Priority: P2)

En la puerta y en el aula, el operador sabe si un escaneo fue Puntual, Tardanza o error mirando la pantalla, sin leer el detalle.

**Why this priority**: En hora punta se escanean cientos de alumnos por minuto y cada duda frena la fila.

**Independent Test**: Mostrar resultados de los cuatro estados y verificar que un observador los distingue correctamente en menos de 1 segundo.

**Acceptance Scenarios**:

1. **Given** un escaneo con estado Puntual, **When** se muestra el resultado, **Then** la tarjeta es verde esmeralda con la etiqueta "Puntual".
2. **Given** un escaneo con estado Tardanza, **When** se muestra el resultado, **Then** la tarjeta es ámbar con la etiqueta "Tardanza".
3. **Given** un código no reconocido, **When** se muestra el resultado, **Then** la tarjeta es roja con la etiqueta de error.

---

### Edge Cases

- Escaneo de un código que no pertenece al sistema: se muestra "código no reconocido" sin crear registros.
- Un alumno olvida su credencial: se puede buscar por código o nombre y registrar con motivo; el detalle está en `004`/`005`.
- Dos dispositivos registran al mismo alumno sin conexión: el conflicto se resuelve con la regla de debounce (`008`).
- Dispositivo con reloj desfasado: se conserva la hora del dispositivo y se registra la hora del servidor; si la diferencia supera 5 minutos, el evento se marca para revisión.
- Almacenamiento local lleno: el sistema avisa antes de perder eventos y no descarta registros pendientes.

## Requirements *(mandatory)*

### Functional Requirements

**Roles y acceso**

- **FR-001**: El sistema MUST ofrecer tres roles: Administrador, Auxiliar de Puerta y Docente, con los permisos de la matriz RBAC.
- **FR-002**: El sistema MUST aplicar el control de acceso en el servidor, no sólo en la interfaz.
- **FR-003**: El sistema MUST NOT tener un actor apoderado y MUST NOT enviar mensajes, alertas ni notificaciones a familias o terceros.
- **FR-004**: El sistema MUST registrar en auditoría las acciones administrativas, las justificaciones y la generación de reportes, con usuario, fecha y detalle.

**Reglas transversales de asistencia**

- **FR-005**: El sistema MUST registrar sólo entradas. No existen eventos de salida, retiros anticipados ni QR de sesión.
- **FR-006**: El sistema MUST aplicar una ventana de enfriamiento (debounce) de 5 minutos por contexto, configurable, independiente para Puerta y para cada curso.
- **FR-007**: El sistema MUST garantizar que un mismo evento, enviado más de una vez, se guarde una sola vez.
- **FR-008**: Cada evento MUST conservar la hora del dispositivo y registrar además la hora del servidor; si difieren más de 5 minutos, el evento MUST marcarse para revisión.

**Interfaz**

- **FR-009**: La interfaz MUST tener una base limpia de alto contraste: fondo `slate-50`, tarjetas blancas con borde sutil y `shadow-sm`; los acentos saturados y degradados se usan sólo en cabeceras, KPIs, gráficos y estados.
- **FR-010**: La cabecera y la navegación MUST usar el degradado `from-indigo-600 via-blue-600 to-cyan-500`.
- **FR-011**: Cada rol MUST tener un acento de identificación visual: Administrador índigo/violeta, Auxiliar de Puerta cian/azul y Docente verde azulado (teal). El acento MUST NOT cambiar el significado de los colores de estado.
- **FR-012**: Los estados MUST codificarse con color y etiqueta de texto: Puntual esmeralda (`emerald-500`, `bg-emerald-100 text-emerald-800`), Tardanza ámbar (`amber-500`, `bg-amber-100 text-amber-800`), Falta o error rojo coral (`rose-500`, `bg-rose-100 text-rose-800`), Justificado azul cobalto (`blue-500`, `bg-blue-100 text-blue-800`).
- **FR-013**: La pantalla de escaneo MUST mostrar un marco con esquinas iluminadas y línea de escaneo animada; al detectar un QR, un destello y una tarjeta grande con nombre, grado, sección y hora, con contraste mínimo de 7:1.
- **FR-014**: La barra superior MUST mostrar de forma persistente "En línea (Sincronizado)" en esmeralda o "Modo Offline (Registros en cola)" en ámbar con el número de pendientes, y MUST reflejar el cambio en menos de 2 segundos.
- **FR-015**: La interfaz MUST ser usable en laptops de 1366×768, tablets y teléfonos; las pantallas operativas MUST NOT exigir desplazamiento horizontal.
- **FR-016**: Las animaciones MUST respetar la preferencia "reducir movimiento" y MUST NOT impedir leer el resultado.

**Restricciones técnicas (solicitadas por el promotor del proyecto)**

- **FR-017**: La base de datos centralizada MUST ser PostgreSQL alojada en Supabase.
- **FR-018**: El almacenamiento local MUST usar IndexedDB mediante Dexie.js.
- **FR-019**: Los estilos MUST usar Tailwind CSS y los gráficos del dashboard MUST usar Recharts.
- **FR-020**: Las comunicaciones MUST usar HTTPS y las contraseñas MUST almacenarse con hash seguro.

### Key Entities *(include if feature involves data)*

- **Alumno**: Persona matriculada; identidad permanente por código/DNI, grado y sección por año escolar. Detalle en `003`.
- **Credencial**: QR único e impreso por alumno, vigente durante el año escolar. Detalle en `003`.
- **Usuario**: Cuenta con rol Administrador, Auxiliar de Puerta o Docente. Detalle en `002`.
- **Grado, Sección, Curso, Turno y Horarios**: Estructura académica y tiempos de entrada. Detalle en `002`.
- **Asistencia de Puerta**: Evento de entrada con estado Puntual o Tardanza. Detalle en `004`.
- **Sesión de clase y Asistencia de Curso**: Registro por curso, con faltas al cerrar la sesión. Detalle en `005`.
- **Justificación**: Permiso previo o justificación posterior con aprobador. Detalle en `006`.
- **Evento pendiente**: Escaneo guardado en el dispositivo a la espera de sincronización. Detalle en `008`.
- **Evento de auditoría**: Acción, usuario, fecha y detalle.

### Matriz de permisos (RBAC)

| Capacidad | Administrador | Auxiliar de Puerta | Docente |
|-----------|:---:|:---:|:---:|
| Crear/gestionar cuentas de usuario | Sí | No | No |
| Configurar grados, secciones, cursos y horarios | Sí | No | No (sólo ver los suyos) |
| Carga masiva de padrón | Sí | No | No |
| Generar credenciales y carnets | Sí | No | No |
| Registrar asistencia en Puerta | Sí (contingencia) | Sí | No |
| Registrar asistencia en Aula | Sí (contingencia) | No | Sí (sus cursos) |
| Abrir y cerrar sesión de aula | No | No | Sí (sus cursos) |
| Justificar faltas y tardanzas | Sí (todas) | No | Sí (sus cursos) |
| Reportes Excel/PDF | Global | Registros de Puerta | Sus secciones y cursos |
| Dashboard | Global | No | Sus secciones |
| Cierre de jornada manual | Sí | No | No |

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un escaneo confirmado en pantalla tarda menos de 2 segundos con red y menos de 1 segundo sin conexión.
- **SC-002**: El sistema procesa picos de 1,000 alumnos en una ventana de 15 minutos sin pérdida de escaneos.
- **SC-003**: El 100% de los eventos registrados sin conexión se sincroniza sin pérdidas ni duplicados en pruebas de 1,000 eventos.
- **SC-004**: Ningún rol accede a datos fuera de su alcance en el 100% de las pruebas de permisos.
- **SC-005**: El 100% de los badges y textos cumple contraste WCAG AA (4.5:1), y la tarjeta de resultado del escáner cumple 7:1.
- **SC-006**: El indicador de conexión refleja el cambio en menos de 2 segundos en el 100% de las pruebas.
- **SC-007**: El sistema no envía ningún mensaje a terceros; verificado en el 100% de los flujos.

## Assumptions

- **Alcance**: Un colegio, dos turnos (mañana y tarde), un año escolar a la vez. Multi-sede queda fuera de alcance.
- **Actores**: Sólo Administrador, Auxiliar de Puerta, Docente y Estudiante (portador de credencial, sin cuenta). No hay apoderado ni cuentas para familias.
- **Sin notificaciones**: No se envían mensajes, alertas ni correos. La consulta es por el personal autorizado dentro del sistema.
- **Asistencia**: Sólo se registra la entrada. La salida y los retiros anticipados no se registran.
- **Credencial**: Impresa en papel y presentada por el alumno; no hay versión digital en teléfonos, porque los alumnos no pueden llevar celular.
- **Dispositivos**: Laptop o celular del personal docente o del Auxiliar, y lectores de mano. Cualquier dispositivo con cuenta válida puede escanear.
- **Autenticación**: Sólo contraseña, sin segundo factor. Riesgo residual aceptado.
- **Conectividad**: Wi-Fi intermitente en puerta y aulas sin cobertura; cada dispositivo sincroniza al menos una vez al día.
- **Idioma y hora**: Interfaz en español; horas en la zona local de la institución.
- **Retención**: El historial se conserva al menos un año escolar y puede exportarse antes de depurarse.
- **Tecnologías impuestas**: Supabase/PostgreSQL, IndexedDB con Dexie.js, Tailwind CSS y Recharts.
- **Fuera de alcance**: salidas, retiros anticipados, QR de sesión, notificaciones, reconocimiento facial, torniquetes, notas académicas, pagos y multi-sede.

## Glosario

| Término canónico | Uso | Sinónimos evitados |
|---|---|---|
| **Falta** | Estado de asistencia del alumno ausente. | ausencia, inasistencia |
| **Ausente** | Persona que no registró entrada o no estuvo en la sesión. | faltante |
| **Institución** | El colegio, en textos de interfaz y documentos. | colegio, escuela |
| **Entrada** | Único evento de puerta que el sistema registra. | marca, ingreso |
| **Sesión de clase** | Instancia de un curso en una fecha, con apertura y cierre. | clase, bloque |
| **Credencial** | Tarjeta impresa con el QR del alumno. | carnet (sólo para el PDF), tarjeta |

Los identificadores `FR-###` y `SC-###` son locales a cada spec. Toda referencia externa MUST usar el prefijo del módulo, por ejemplo `003/FR-004`.
