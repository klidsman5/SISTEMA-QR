"use client";

import { useActionState } from "react";
import { revocarCredencialState, type EstadoCredencial } from "./actions";

export function RevocarForm({ alumnoId }: { alumnoId: string }) {
  const [estado, accion, pendiente] = useActionState<EstadoCredencial, FormData>(
    revocarCredencialState,
    null,
  );

  return (
    <form action={accion} className="flex flex-col gap-1">
      <input type="hidden" name="alumnoId" value={alumnoId} />
      <button
        type="submit"
        disabled={pendiente}
        className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100 disabled:opacity-50"
      >
        {pendiente ? "…" : "Revocar y reemitir"}
      </button>
      {estado?.ok ? <span className="text-xs text-emerald-700">{estado.ok}</span> : null}
      {estado?.error ? <span className="text-xs text-rose-700">{estado.error}</span> : null}
    </form>
  );
}
