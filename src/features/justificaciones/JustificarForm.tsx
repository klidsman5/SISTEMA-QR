"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field } from "@/components/ui";

export function JustificarForm({
  alumnoId,
  fecha,
  tipoInicial = "posterior",
}: {
  alumnoId?: string;
  fecha?: string;
  tipoInicial?: "previo" | "posterior";
}) {
  const router = useRouter();
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function enviar(formData: FormData) {
    setMensaje(null);
    setError(null);

    const payload = {
      alumno_id: alumnoId,
      dni: alumnoId ? undefined : String(formData.get("dni") ?? ""),
      tipo: String(formData.get("tipo") ?? tipoInicial),
      nivel: String(formData.get("nivel") ?? "ambos"),
      fecha: String(formData.get("fecha") ?? fecha ?? ""),
      motivo: String(formData.get("motivo") ?? ""),
      observacion: String(formData.get("observacion") ?? ""),
    };

    const r = await fetch("/api/justificaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const json = await r.json();

    if (!r.ok) {
      setError(json?.error?.message ?? "No se pudo registrar");
      return;
    }

    setMensaje(`Justificación aplicada: ${json.data.aplicado.puerta} en puerta, ${json.data.aplicado.aula} en aula.`);
    router.refresh();
  }

  return (
    <form action={enviar} className="grid gap-3 sm:grid-cols-2">
      {!alumnoId ? <Field label="DNI del alumno" name="dni" required placeholder="70123456" /> : null}
      <Field label="Fecha" name="fecha" type="date" defaultValue={fecha} required />
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Tipo</span>
        <select name="tipo" defaultValue={tipoInicial} className="rounded-lg border border-slate-300 bg-white px-3 py-2">
          <option value="posterior">Justificación posterior</option>
          <option value="previo">Permiso previo</option>
        </select>
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-slate-700">Nivel</span>
        <select name="nivel" defaultValue="ambos" className="rounded-lg border border-slate-300 bg-white px-3 py-2">
          <option value="ambos">Puerta y aula</option>
          <option value="puerta">Sólo puerta</option>
          <option value="aula">Sólo aula</option>
        </select>
      </label>
      <Field label="Motivo" name="motivo" required placeholder="Cita médica" />
      <Field label="Observación" name="observacion" required placeholder="Presentó certificado" />

      <div className="sm:col-span-2">
        <Button>Registrar justificación</Button>
        {mensaje ? <span className="ml-3 text-sm text-emerald-700">{mensaje}</span> : null}
        {error ? <span className="ml-3 text-sm text-rose-700">{error}</span> : null}
      </div>
    </form>
  );
}
