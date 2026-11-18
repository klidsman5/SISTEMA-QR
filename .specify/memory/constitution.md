<!--
SYNC IMPACT REPORT (scratch, eliminar antes de commit)
Version change: 1.0.0 → 2.0.0
Bump rationale: MAJOR. Se elimina un requisito obligatorio de integración (Telegram Bot API) y el
  dato de contacto del apoderado; se redefinen el alcance del Principio I y el cierre del Principio
  V, y se añade la regla de alcance de sólo entradas. Son cambios incompatibles con el texto previo.
Modified principles:
  I. Privacidad y Protección de Datos de Menores — se quita el contacto de Telegram y se prohíbe
     exponer datos en mensajes a terceros.
  II. Doble Nivel de Control con Contextos Independientes — se añade que sólo se registran entradas
     y que no existe QR de sesión.
  III. Offline-First e Integridad de Sincronización — el rationale ya no habla de alertas a
     familias.
  V. Trazabilidad y Auditabilidad — el cierre de jornada ya no menciona alertas.
Added sections: ninguna nueva; se añade una regla de alcance en el Principio II y una restricción
  de no mensajería en Restricciones Técnicas y de Seguridad.
Removed sections: ninguna.
Deferred TODOs: TODO(RATIFICATION_DATE) se mantiene en 2026-11-17 (fecha de adopción asumida).
Fuente: specs/001-asistencia-qr-escolar/spec.md (spec padre) y specs/002 a 008.
-->

# Constitución del Sistema de Asistencia Escolar por QR

## Core Principles

### I. Privacidad y Protección de Datos de Menores

Los datos de los alumnos son datos de menores y MUST tratarse con el máximo nivel de cuidado.

- El sistema MUST recolectar sólo los datos definidos en el padrón (código/DNI, nombres, apellidos,
  grado y sección) y los datos de asistencia necesarios.
- El identificador QR de cada credencial MUST ser un UUID no predecible y MUST NOT contener datos
  personales.
- Los datos de salud o motivos de justificación MUST limitarse a lo estrictamente necesario y MUST
  NOT compartirse fuera del personal autorizado.
- Ningún reporte, carnet o pantalla MUST exponer datos de alumnos a personas sin rol autorizado.
- El sistema MUST NOT enviar datos de alumnos por mensajería, correo ni ningún canal hacia terceros.

Rationale: la filtración de datos de menores causa daño irreversible y genera responsabilidad legal
para la institución.

### II. Doble Nivel de Control con Contextos Independientes

La asistencia de puerta (Nivel 1) y la asistencia de aula o curso (Nivel 2) son contextos separados.

- Cada registro MUST identificar su nivel (Puerta o Aula) y, si es de aula, su curso y docente.
- La ventana de enfriamiento (debounce) MUST aplicarse de forma independiente por contexto: un
  registro en Puerta MUST NOT bloquear un registro en un curso, y un curso MUST NOT bloquear a otro.
- El debounce por defecto es de 5 minutos y MUST ser configurable por el Administrador.
- Un registro de aula MUST NOT modificar ni borrar un registro de puerta, y viceversa.
- El sistema MUST registrar únicamente entradas. MUST NOT existir registro de salidas, retiros
  anticipados ni QR de sesión escaneado por alumnos.

Rationale: el alumno debe poder marcar en la entrada y luego en su salón sin conflictos, y los
reportes deben poder separar ambos niveles sin datos que el colegio no usa.

### III. Offline-First e Integridad de Sincronización

El registro de asistencia MUST funcionar sin conexión y MUST NOT perder ni duplicar eventos.

- Cada escaneo MUST guardarse localmente con su hora original antes de intentar enviarse al servidor.
- Cada evento MUST tener un identificador único generado en el dispositivo; el servidor MUST aceptar
  un evento repetido sin duplicarlo (idempotencia).
- La sincronización MUST ser en lote y MUST reintentarse ante fallos sin eliminar eventos pendientes.
- Un evento local MUST NOT eliminarse hasta confirmar su recepción por el servidor, salvo
  autorización explícita del Administrador.
- La hora del dispositivo MUST conservarse, y el servidor MUST registrar su propia hora de recepción.

Rationale: las aulas y la puerta pueden no tener cobertura; un evento perdido produce una falta falsa
y un reporte incorrecto que nadie puede explicar.

### IV. Control de Acceso por Rol (RBAC)

Cada usuario MUST operar sólo dentro del alcance de su rol.

- Los roles son Administrador, Auxiliar de Puerta y Docente. El alumno no tiene cuenta. Los
  apoderados no son actores del sistema. Cualquier nuevo rol MUST añadirse mediante enmienda.
- El control de acceso MUST aplicarse en el servidor (base de datos y API), no sólo en la interfaz.
- Un Docente MUST acceder únicamente a sus cursos y secciones asignadas.
- Un Auxiliar de Puerta MUST acceder únicamente a registros de Puerta y a sus propios registros del día.
- Las cuentas MUST ser creadas y dadas de baja sólo por el Administrador.

Rationale: la matriz de permisos de la especificación sólo es válida si el sistema la hace cumplir.

### V. Trazabilidad y Auditabilidad

Todo cambio sobre asistencia MUST poder reconstruirse a partir del historial.

- Toda justificación MUST registrar quién la aprobó, cuándo y con qué motivo.
- Las justificaciones y correcciones MUST agregar un nuevo registro de historial; MUST NOT sobrescribir
  ni borrar el registro original.
- Las acciones administrativas y la generación de reportes MUST quedar en auditoría con usuario,
  fecha y parámetros.
- El cierre de jornada MUST ser idempotente: ejecutarlo más de una vez para el mismo día MUST NOT
  duplicar faltas.

Rationale: la institución debe poder responder ante la dirección sobre cualquier estado de
asistencia.

## Restricciones Técnicas y de Seguridad

- La base de datos centralizada MUST ser PostgreSQL alojada en Supabase, con historial completo.
- El almacenamiento local en el dispositivo MUST usar IndexedDB mediante Dexie.js.
- El sistema MUST NOT integrar servicios de mensajería ni enviar notificaciones a apoderados o
  terceros. Toda la información se consulta dentro del sistema con control de rol.
- Las comunicaciones MUST usar HTTPS/TLS.
- Las contraseñas MUST almacenarse con hash seguro; ninguna contraseña en texto plano.
- La autenticación es sólo con contraseña, sin segundo factor (decisión del promotor; riesgo
  residual aceptado y documentado en la spec padre).
- Los reportes Excel y PDF MUST generarse con los mismos datos y filtros que la consulta en pantalla.
- El sistema MUST soportar 1,000 alumnos con picos de escaneo de hasta 15 minutos sin degradación
  perceptible para el usuario.

## Flujo de Desarrollo y Calidad

- Toda funcionalidad MUST derivarse de una especificación aprobada en `specs/` antes de implementarse.
- Las reglas de debounce, cálculo de estado (Puntual/Tardanza/Falta), sincronización idempotente y
  cierre de jornada MUST tener pruebas automatizadas que cubran sus escenarios de aceptación.
- Los cambios en permisos RBAC MUST incluir pruebas que verifiquen que un rol no accede a datos de
  otro alcance.
- Ninguna versión MUST desplegarse en producción sin validar la carga de 1,000 alumnos y la
  sincronización de un lote de al menos 1,000 eventos offline.
- Los cambios de esquema de base de datos MUST ser versionados y reversibles.

## Governance

Esta constitución prevalece sobre cualquier otra práctica del proyecto. Cualquier especificación,
plan o tarea que contradiga un principio MUST corregirse o justificarse explícitamente.

- **Enmiendas**: MUST proponerse por escrito, describir el cambio y su impacto, y ser aprobadas por el
  responsable del proyecto antes de aplicarse. Toda enmienda MUST actualizar la versión y la fecha de
  última modificación de este documento.
- **Versionado**: se usa versionado semántico.
  - MAJOR: eliminación o redefinición incompatible de un principio, rol o integración obligatoria.
  - MINOR: nuevo principio, sección o requisito obligatorio.
  - PATCH: aclaraciones, correcciones de redacción o refinamientos no semánticos.
- **Revisión de cumplimiento**: toda revisión de código o de especificación MUST verificar el
  cumplimiento de estos principios. Las excepciones MUST documentarse con su justificación y su
  fecha de revisión.
- **Guía de ejecución**: `specs/001-asistencia-qr-escolar/spec.md` es la spec padre y fuente del
  alcance; `specs/002` a `specs/008` contienen el detalle funcional por módulo.

**Version**: 2.0.0 | **Ratified**: 2026-11-17 | **Last Amended**: 2026-11-17
