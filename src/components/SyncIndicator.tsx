"use client";

import { useCallback, useEffect, useState } from "react";
import { contarPendientes } from "@/lib/offline/queue";
import { sincronizar } from "@/lib/offline/sync";

export function SyncIndicator() {
  const [online, setOnline] = useState(true);
  const [pendientes, setPendientes] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sincronizando, setSincronizando] = useState(false);

  const refrescar = useCallback(async () => {
    try {
      setPendientes(await contarPendientes());
    } catch {
      setPendientes(0);
    }
  }, []);

  const ejecutar = useCallback(async () => {
    if (!navigator.onLine) return;
    setSincronizando(true);
    const resultado = await sincronizar();
    setSincronizando(false);
    setError(resultado.error ?? null);
    await refrescar();
  }, [refrescar]);

  useEffect(() => {
    setOnline(navigator.onLine);
    void refrescar();
    void ejecutar();

    const onOnline = () => {
      setOnline(true);
      void ejecutar();
    };
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    const intervalo = setInterval(() => {
      void refrescar();
      void ejecutar();
    }, 30_000);

    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      clearInterval(intervalo);
    };
  }, [ejecutar, refrescar]);

  const sincronizado = online && pendientes === 0;

  return (
    <span
      title={error ?? (sincronizado ? "Todo sincronizado" : "Registros esperando sincronización")}
      className={
        sincronizado
          ? "rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800"
          : "rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
      }
    >
      {sincronizado
        ? "En línea (Sincronizado)"
        : sincronizando
          ? "Sincronizando…"
          : `Modo Offline (${pendientes} en cola)`}
    </span>
  );
}
