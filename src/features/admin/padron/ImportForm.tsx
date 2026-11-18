"use client";

import { useActionState } from "react";
import { confirmarImportacion, previsualizarImportacion } from "./actions";
import type { EstadoImportacion } from "./types";
import { Button, Field } from "@/components/ui";

export function ImportForm({ anio }: { anio: number }) {
  const [preview, previsualizar, cargandoPreview] = useActionState<EstadoImportacion, FormData>(
    previsualizarImportacion,
    null,
  );
  const [confirmacion, confirmar, cargandoConfirmar] = useActionState<EstadoImportacion, FormData>(
    confirmarImportacion,
    null,
  );

  return (
    <div className="flex flex-col gap-6">
      <form action={previsualizar} className="grid gap-4 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm sm:col-span-2">
          <span className="font-medium text-slate-700">Archivo CSV o XLSX</span>
          <input
            type="file"
            name="archivo"
            accept=".csv,.xlsx"
            required
            className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          />
        </label>
        <Field label="Año escolar" name="anio" type="number" min={2000} max={2100} defaultValue={anio} required />
        <div className="sm:col-span-3">
          <Button>{cargandoPreview ? "Validando…" : "Validar archivo"}</Button>
        </div>
      </form>

      {preview?.error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{preview.error}</p>
      ) : null}

      {preview?.ok ? (
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm">
          <p className="font-medium text-slate-900">
            {preview.ok} · errores: {preview.errores?.length ?? 0}
          </p>
          {preview.errores && preview.errores.length > 0 ? (
            <ul className="mt-3 max-h-40 overflow-auto rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
              {preview.errores.map((e) => (
                <li key={`${e.fila}-${e.campo}`}>
                  Fila {e.fila} · {e.campo}: {e.detalle}
                </li>
              ))}
            </ul>
          ) : null}

          {preview.importId ? (
            <a
              className="mt-3 inline-block text-xs font-medium text-indigo-700 underline"
              href={`/api/admin/padron/import/${preview.importId}/errores`}
            >
              Descargar errores en CSV
            </a>
          ) : null}

          {preview.importId ? (
            <form action={confirmar} className="mt-4">
              <input type="hidden" name="importId" value={preview.importId} />
              <Button>{cargandoConfirmar ? "Confirmando…" : "Confirmar importación"}</Button>
            </form>
          ) : null}
        </div>
      ) : null}

      {confirmacion?.ok ? (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{confirmacion.ok}</p>
      ) : null}
      {confirmacion?.error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{confirmacion.error}</p>
      ) : null}
    </div>
  );
}
