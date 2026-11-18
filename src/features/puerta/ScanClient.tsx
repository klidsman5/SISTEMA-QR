"use client";

import { useEffect, useRef, useState } from "react";
import { QrScanner } from "@/components/scanner/QrScanner";
import { Button, Field } from "@/components/ui";
import { buscarCredencial, encolar, guardarPadron } from "@/lib/offline/queue";
import { estadoPreliminar } from "@/lib/offline/preliminar";

interface Resultado {
  resultado: string;
  estado?: string;
  motivo?: string;
  alumno?: { nombre: string; dni: string; grado: string; seccion: string } | null;
  hora?: string;
}

const colores: Record<string, string> = {
  puntual: "border-emerald-500 bg-emerald-50 text-emerald-900",
  tardanza: "border-amber-500 bg-amber-50 text-amber-900",
  falta: "border-rose-500 bg-rose-50 text-rose-900",
  justificado: "border-blue-500 bg-blue-50 text-blue-900",
  en_cola: "border-amber-500 bg-amber-50 text-amber-900",
};

export function ScanClient() {
  const [activo, setActivo] = useState(true);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const ultimo = useRef<{ codigo: string; hora: number } | null>(null);

  useEffect(() => {
    fetch("/api/padron/cache")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (json?.data) void guardarPadron(json.data);
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!resultado) return;
    const t = setTimeout(() => setResultado(null), resultado.resultado === "en_cola" ? 5000 : 3000);
    return () => clearTimeout(t);
  }, [resultado]);

  async function enCola(qrUuid: string) {
    const cache = await buscarCredencial(qrUuid);
    const estado = cache ? estadoPreliminar(cache.hora_entrada, cache.tolerancia_min) : undefined;

    await encolar({
      evento_id: crypto.randomUUID(),
      tipo: "puerta",
      payload: { qr_uuid: qrUuid, origen: "escaneo" },
    });

    setResultado({
      resultado: "en_cola",
      estado,
      motivo: "Guardado en el dispositivo; se enviará al recuperar la red",
      alumno: cache
        ? { nombre: cache.nombre, dni: "", grado: cache.grado, seccion: cache.seccion }
        : null,
      hora: new Date().toISOString(),
    });
  }

  async function registrar(payload: Record<string, unknown>, qrUuid?: string) {
    if (cargando) return;
    setCargando(true);
    setError(null);

    if (!navigator.onLine && qrUuid) {
      await enCola(qrUuid);
      setCargando(false);
      return;
    }

    try {
      const respuesta = await fetch("/api/attendance/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, dispositivo_id: "web-puerta" }),
      });
      const json = await respuesta.json();

      if (!respuesta.ok) {
        setError(json?.error?.message ?? "No se pudo registrar");
        setResultado({ resultado: "error", motivo: json?.error?.code, hora: new Date().toISOString() });
        return;
      }

      setResultado(json.data as Resultado);
    } catch {
      if (qrUuid) {
        await enCola(qrUuid);
      } else {
        setError("Sin conexión. El registro manual necesita red.");
      }
    } finally {
      setCargando(false);
    }
  }

  function onDetected(texto: string) {
    const limpio = texto.startsWith("ASIS:") ? texto.slice(5) : texto;
    const ahora = Date.now();

    if (ultimo.current && ultimo.current.codigo === limpio && ahora - ultimo.current.hora < 3000) {
      return;
    }
    ultimo.current = { codigo: limpio, hora: ahora };
    void registrar({ qr_uuid: limpio, origen: "escaneo" }, limpio);
  }

  const tarjeta =
    resultado?.estado && colores[resultado.estado] ? colores[resultado.estado] : "border-rose-500 bg-rose-50 text-rose-900";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <QrScanner activo={activo} onDetected={onDetected} />

        <div className="flex gap-2">
          <Button variant="ghost" type="button" onClick={() => setActivo((v) => !v)}>
            {activo ? "Pausar cámara" : "Activar cámara"}
          </Button>
        </div>

        <form
          className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault();
            const datos = new FormData(e.currentTarget);
            void registrar({
              dni: String(datos.get("dni") ?? ""),
              motivo: String(datos.get("motivo") ?? ""),
              origen: "manual",
            });
            e.currentTarget.reset();
          }}
        >
          <Field label="DNI o código" name="dni" required placeholder="70123456" />
          <Field label="Motivo (sin credencial)" name="motivo" required placeholder="Credencial olvidada" />
          <div className="sm:col-span-2">
            <Button variant="ghost">Registrar manualmente</Button>
          </div>
        </form>
      </div>

      <div className="flex flex-col gap-3">
        {resultado ? (
          <div className={`rounded-2xl border-2 p-6 ${tarjeta}`}>
            <p className="text-xs uppercase tracking-widest opacity-70">
              {resultado.resultado === "duplicado"
                ? "Duplicado"
                : resultado.resultado === "reconciliado"
                  ? "Entrada reconciliada"
                  : resultado.resultado === "en_cola"
                    ? "Guardado sin conexión"
                    : resultado.estado
                      ? `Entrada ${resultado.estado}`
                      : "No registrado"}
            </p>
            <p className="mt-2 text-3xl font-bold leading-tight">
              {resultado.alumno?.nombre ?? "—"}
            </p>
            <p className="mt-1 text-lg font-medium">
              {resultado.alumno ? `${resultado.alumno.grado} ${resultado.alumno.seccion}` : resultado.motivo ?? ""}
            </p>
            <p className="mt-4 text-2xl font-semibold tabular-nums">
              {resultado.hora ? new Date(resultado.hora).toLocaleTimeString("es-PE") : ""}
            </p>
            {resultado.motivo ? <p className="mt-2 text-sm opacity-80">{resultado.motivo}</p> : null}
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white text-sm text-slate-500">
            {cargando ? "Registrando…" : "Presenta una credencial frente a la cámara"}
          </div>
        )}

        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600">
          <p className="font-medium text-slate-800">Reglas de puerta</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Una entrada por alumno y día.</li>
            <li>Un segundo escaneo en 5 minutos se marca como duplicado.</li>
            <li>Sin red, el registro queda en cola y se envía solo.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
