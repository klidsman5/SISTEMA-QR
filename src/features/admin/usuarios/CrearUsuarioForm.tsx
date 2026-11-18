"use client";

import { useActionState } from "react";
import { crearUsuarioState, type EstadoAccion } from "./actions";
import { Button, Field, Select } from "@/components/ui";

export function CrearUsuarioForm() {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(crearUsuarioState, null);

  return (
    <form action={accion} className="grid gap-4 sm:grid-cols-2">
      <Field label="Nombre completo" name="nombre" required placeholder="Ana Torres" />
      <Field label="Usuario" name="username" required placeholder="ana.torres" />
      <Select label="Rol" name="rol" required defaultValue="docente">
        <option value="docente">Docente</option>
        <option value="auxiliar_puerta">Auxiliar de Puerta</option>
        <option value="administrador">Administrador</option>
      </Select>
      <Field label="Contraseña inicial" name="password" type="password" required min={8} />

      <div className="sm:col-span-2">
        <Button>{pendiente ? "Creando…" : "Crear cuenta"}</Button>
        {estado?.ok ? <span className="ml-3 text-sm text-emerald-700">{estado.ok}</span> : null}
        {estado?.error ? <span className="ml-3 text-sm text-rose-700">{estado.error}</span> : null}
      </div>
    </form>
  );
}
