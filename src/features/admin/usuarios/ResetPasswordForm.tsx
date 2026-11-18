"use client";

import { useActionState } from "react";
import { restablecerPasswordState, type EstadoAccion } from "./actions";

export function ResetPasswordForm({ id }: { id: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoAccion, FormData>(
    restablecerPasswordState,
    null,
  );

  return (
    <form action={accion} className="flex flex-col gap-2">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        disabled={pendiente}
        className="rounded-lg border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 disabled:opacity-50"
      >
        {pendiente ? "Generando…" : "Restablecer contraseña"}
      </button>
      {estado?.ok ? (
        <p className="rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-800">{estado.ok}</p>
      ) : null}
      {estado?.error ? (
        <p className="rounded bg-rose-50 px-2 py-1 text-xs text-rose-700">{estado.error}</p>
      ) : null}
    </form>
  );
}
