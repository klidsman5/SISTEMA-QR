"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { QrScanner } from "@/components/scanner/QrScanner";
import { Badge, Button } from "@/components/ui";
import { buscarCredencial, encolar, guardarPadron } from "@/lib/offline/queue";
import { estadoPreliminar } from "@/lib/offline/preliminar";

interface FilaRoster {
  alumno_id: string;
  nombre: string;
  dni: string;
  estado: string;
  hora: string | null;
  origen: string | null;
}

interface Props {
  sesionId: string;
  curso: string;
  abierta: boolean;
  rosterInicial: FilaRoster[];
}

interface Resultado {
  resultado: string;
  estado?: string;
  motivo?: string;
  alumno?: { nombre: string; dni: string } | null;
  hora?: string;
}

export function SessionClient({ sesionId, curso, abierta, rosterInicial }: Props) {
  const router = useRouter();
  const [sesionAbierta, setSesionAbierta] = useState(abierta);
  const [roster, setRoster] = useState(rosterInicial);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const ultimo = useRef<{ codigo: string; hora: number } | null>(null);

  const refrescar = useCallback(async () => {
    const r = await fetch(`/api/sesiones/${sesionId}/roster`);
    if (!r.ok) return;
    const json = await r.json();
    setRoster(json.data.roster as FilaRoster[]);
    setSesionAbierta(json.data.sesion.estado === "abierta");
  }, [sesionId]);

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
    const t = setTimeout(() => setResultado(null), 3000);
    return () => clearTimeout(t);
  }, [resultado]);

  async function registrar(texto: string) {
    const limpio = texto.startsWith("ASIS:") ? texto.slice(5) : texto;
    const ahora = Date.now();
    if (ultimo.current && ultimo.current.codigo === limpio && ahora - ultimo.current.hora < 3000) return;
    ultimo.current = { codigo: limpio, hora: ahora };

    if (cargando) return;
    setCargando(true);
    setError(null);

    async function enCola() {
      const cache = await buscarCredencial(limpio);
      await encolar({
        evento_id: crypto.randomUUID(),
        tipo: "aula",
        payload: { sesion_id: sesionId, qr_uuid: limpio },
      });
      setResultado({
        resultado: "en_cola",
        estado: cache ? estadoPreliminar(cache.hora_entrada, cache.tolerancia_min) : undefined,
        motivo: "Guardado en el dispositivo; se enviará al recuperar la red",
        alumno: cache ? { nombre: cache.nombre, dni: "" } : null,
        hora: new Date().toISOString(),
      });
    }

    if (!navigator.onLine) {
      await enCola();
      setCargando(false);
      return;
    }

    try {
      const r = await fetch("/api/attendance/class", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sesion_id: sesionId, qr_uuid: limpio, dispositivo_id: "web-aula" }),
      });
      const json = await r.json();
      setCargando(false);

      if (!r.ok) {
        setError(json?.error?.message ?? "No se pudo registrar");
        setResultado({ resultado: "error", motivo: json?.error?.message, hora: new Date().toISOString() });
        return;
      }

      setResultado(json.data as Resultado);
      void refrescar();
    } catch {
      await enCola();
      setCargando(false);
    }
  }

  async function cerrar() {
    if (!confirm("¿Cerrar la sesión y marcar faltas a los ausentes?")) return;
    const r = await fetch(`/api/sesiones/${sesionId}/cerrar`, { method: "POST" });
    const json = await r.json();
    if (!r.ok) {
      setError(json?.error?.message ?? "No se pudo cerrar");
      return;
    }
    setSesionAbierta(false);
    await refrescar();
    router.refresh();
  }

  const presentes = roster.filter((r) => r.estado !== "sin_registro" && r.estado !== "falta").length;
  const tarjeta =
    resultado?.resultado === "en_cola"
      ? "border-amber-500 bg-amber-50 text-amber-900"
      : resultado?.estado === "puntual"
        ? "border-emerald-500 bg-emerald-50 text-emerald-900"
        : resultado?.estado === "tardanza"
          ? "border-amber-500 bg-amber-50 text-amber-900"
          : "border-rose-500 bg-rose-50 text-rose-900";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        {sesionAbierta ? (
          <QrScanner activo onDetected={registrar} />
        ) : (
          <div className="flex h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white text-sm text-slate-500">
            La sesión está cerrada.
          </div>
        )}

        {resultado ? (
          <div className={`rounded-2xl border-2 p-5 ${tarjeta}`}>
            <p className="text-xs uppercase tracking-widest opacity-70">
              {resultado.resultado === "duplicado"
                ? "Duplicado"
                : resultado.resultado === "reconciliado"
                  ? "Reconciliado"
                  : resultado.resultado === "en_cola"
                    ? "Guardado sin conexión"
                    : resultado.estado ?? "No registrado"}
            </p>
            <p className="mt-1 text-2xl font-bold">{resultado.alumno?.nombre ?? "—"}</p>
            {resultado.motivo ? <p className="mt-1 text-sm opacity-80">{resultado.motivo}</p> : null}
          </div>
        ) : null}

        {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

        <div className="flex gap-2">
          <Button variant="ghost" type="button" onClick={() => void refrescar()}>
            Actualizar lista
          </Button>
          {sesionAbierta ? (
            <Button variant="danger" type="button" onClick={() => void cerrar()}>
              Cerrar sesión
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900">{curso}</h2>
          <Badge tone={sesionAbierta ? "success" : "neutral"}>
            {sesionAbierta ? "Abierta" : "Cerrada"}
          </Badge>
        </div>
        <p className="mb-3 text-sm text-slate-600">
          {presentes} de {roster.length} registrados · {cargando ? "registrando…" : "listo"}
        </p>

        <div className="max-h-96 overflow-auto">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-slate-100">
              {roster.map((f) => (
                <tr key={f.alumno_id}>
                  <td className="px-1 py-2">{f.nombre}</td>
                  <td className="px-1 py-2">
                    <Badge
                      tone={
                        f.estado === "puntual"
                          ? "success"
                          : f.estado === "tardanza"
                            ? "warning"
                            : f.estado === "falta"
                              ? "danger"
                              : f.estado === "justificado"
                                ? "info"
                                : "neutral"
                      }
                    >
                      {f.estado}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
