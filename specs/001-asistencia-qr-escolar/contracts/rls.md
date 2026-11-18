# Contrato de seguridad: RLS y funciones

Toda tabla tiene RLS habilitado. Las políticas usan `auth.uid()` y una función
`public.rol_actual()` que lee `usuarios.auth_user_id`. Los route handlers usan el cliente del
usuario; sólo `cerrar_jornada` y la sincronización por lote corren con un rol de servicio limitado.

## Funciones auxiliares

```sql
create function public.rol_actual() returns rol_usuario
  language sql stable security definer as $$
  select rol from public.usuarios where auth_user_id = auth.uid() and activo;
$$;

create function public.es_administrador() returns boolean
  language sql stable as $$ select public.rol_actual() = 'administrador'; $$;
```

## Políticas por tabla

| Tabla | Administrador | Auxiliar de Puerta | Docente |
|---|---|---|---|
| `usuarios` | todo | sólo su fila | sólo su fila |
| `turnos`, `grados`, `secciones` | todo | lectura | lectura |
| `cursos` | todo | lectura | sólo `docente_id = auth.uid()` |
| `alumnos`, `matriculas`, `credenciales` | todo | lectura del padrón necesario para escanear | lectura de alumnos de sus secciones |
| `asistencias_puerta` | todo | insertar y leer las del día; no modificar | sin acceso |
| `asistencias_curso` | todo | sin acceso | insertar y leer sólo sesiones de sus cursos |
| `sesiones_clase` | lectura | sin acceso | todo sobre sus cursos |
| `justificaciones` | todo | sin acceso | insertar y leer las de sus cursos |
| `cierres_jornada` | todo | lectura de su turno | sin acceso |
| `reportes_generados`, `auditoria` | todo | sólo sus registros | sólo sus registros |
| `eventos_descartados` | lectura | lectura de sus envíos | lectura de sus envíos |

Reglas adicionales:

- Un Docente sólo puede insertar en `asistencias_curso` si la sesión pertenece a un curso con
  `docente_id = auth.uid()` y la sesión está abierta.
- El Auxiliar sólo puede insertar en `asistencias_puerta` si `registrado_por = auth.uid()`.
- Nadie puede `DELETE` en tablas de asistencia, padrón ni auditoría: se usan estados (`de_baja`,
  `revocada`, `revertida`).
- `usuarios.rol` sólo lo modifica un Administrador.

## Funciones de negocio

| Función | Firma | Reglas |
|---|---|---|
| `evaluar_debounce` | `(contexto text, alumno uuid, ocurrido timestamptz) returns text` | Devuelve `aplicar` o `descartar`; ventana de 5 min por contexto. |
| `registrar_asistencia_puerta` | `(evento jsonb) returns jsonb` | Única autoridad de puerta: valida credencial, calcula estado, congela regla, aplica debounce y reconcilia la fila del día (permiso o falta previa). |
| `registrar_asistencia_curso` | `(evento jsonb) returns jsonb` | Única autoridad de aula: valida sesión abierta, sección, credencial, debounce y reconcilia la falta previa del cierre. |
| `cerrar_sesion` | `(sesion uuid) returns jsonb` | Marca faltas a los no registrados, respeta permisos vigentes. Idempotente. |
| `cerrar_jornada` | `(turno uuid, fecha date) returns jsonb` | Marca faltas del turno, respeta justificaciones; idempotente por unique. |
| `aplicar_justificacion` | `(justificacion uuid) returns void` | Cambia estado y escribe historial y auditoría. |

## Invariantes que la base debe garantizar

1. `asistencias_puerta.evento_id` único → idempotencia de sincronización.
2. `unique(alumno_id, fecha)` en puerta → una entrada diaria.
3. `unique(sesion_id, alumno_id)` en aula → una asistencia por sesión.
4. `unique(turno_id, fecha)` en `cierres_jornada` → cierre idempotente.
5. Índice parcial único de credencial vigente por alumno.
6. `hora_entrada_aplicada` y `tolerancia_aplicada` no nulas en registros calculados.
