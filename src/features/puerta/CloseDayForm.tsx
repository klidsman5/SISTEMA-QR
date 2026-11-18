"use client";

import { useState } from "react";
import { Button, Field } from "@/components/ui";

interface Turno {
  id: string;
  nombre: string;
  hora_cierre: string;
}

export function CloseDayForm({ turnos, fecha }: { turnos: Turno[]; fecha: string }) {
  const [turno, setTurno] = useState(turnos[0]?.id ?? "");
  const [precheck, setPrecheck] = useState<{ alumnosActivos: number; conEntrada: number; sinEntrada: number } | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function consultar() {
    setError(null);
    const r = await fetch(`/api/attendance/close-day/precheck?turno=${turno}&fecha=${fecha}`);
    const json = await r.json();
    if (!r.ok) return setError(json?.error?.message ?? "No se pudo consultar");
    setPrecheck(json.data);
  }

  async function cerrar() {
    setError(null);
    setMensaje(null);
    const r = await fetch("/api/attendance/close-day", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ turno_id: turno, fecha }),
    });
    const json = await r.json();
    if (!r.ok) return setError(json?.error?.message ?? "No se pudo cerrar");
    setMensaje(
      json.data?.resultado === "ya_cerrado"
        ? "La jornada ya estaba cerrada para ese turno."
        : `Cierre completado: ${json.data?.faltas ?? 0} faltas, ${json.data?.exceptuados ?? 0} justificados.`,
    );
    setPrecheck(null);
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700">Turno</span>
          <select
            value={turno}
            onChange={(e) => setTurno(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2"
          >
            {turnos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nombre} (cierre {t.hora_cierre.slice(0, 5)})
              </option>
            ))}
          </select>
        </label>
        <Field label="Fecha" name="fecha" type="date" defaultValue={fecha} />
        <div className="flex items-end gap-2">
          <Button variant="ghost" type="button" onClick={consultar}>
            Consultar
          </Button>
          <Button variant="danger" type="button" onClick={cerrar}>
            Cerrar jornada
          </Button>
        </div>
      </div>

      {precheck ? (
        <div className="rounded-lg bg-amber-50 px-3 py-3 text-sm text-amber-900">
          {precheck.alumnosActivos} alumnos activos · {precheck.conEntrada} con entrada ·{" "}
          <strong>{precheck.sinEntrada} sin entrada</strong>. Al cerrar, esos alumnos quedarán como falta.
        </div>
      ) : null}

      {mensaje ? <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{mensaje}</p> : null}
      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
