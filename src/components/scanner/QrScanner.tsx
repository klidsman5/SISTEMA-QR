"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  onDetected: (codigo: string) => void;
  activo: boolean;
}

export function QrScanner({ onDetected, activo }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activo) return;
    let controls: { stop: () => void } | null = null;
    let cancelado = false;

    async function iniciar() {
      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        const reader = new BrowserQRCodeReader();
        const resultado = await reader.decodeFromVideoDevice(undefined, videoRef.current!, (texto) => {
          if (texto) onDetected(texto.getText());
        });
        if (cancelado) resultado.stop();
        else controls = resultado;
      } catch {
        setError("No se pudo acceder a la cámara. Usa el registro por DNI.");
      }
    }

    iniciar();

    return () => {
      cancelado = true;
      controls?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activo]);

  return (
    <div className="relative overflow-hidden rounded-2xl border-4 border-cyan-400/70 bg-slate-900">
      <video ref={videoRef} className="h-64 w-full object-cover" muted playsInline />

      {activo ? (
        <>
          <div className="pointer-events-none absolute inset-4 rounded-xl border-2 border-cyan-300/80" />
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-1 w-2/3 -translate-x-1/2 animate-pulse rounded bg-cyan-300/90" />
        </>
      ) : null}

      {error ? (
        <p className="absolute inset-0 flex items-center justify-center bg-slate-900/80 px-6 text-center text-sm text-amber-200">
          {error}
        </p>
      ) : null}
    </div>
  );
}
