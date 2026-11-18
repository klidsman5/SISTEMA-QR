"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OpenSessionButton({ cursoId, abierta }: { cursoId: string; abierta: boolean }) {
  const router = useRouter();
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function abrir() {
    setCargando(true);
    setError(null);
    const r = await fetch("/api/sesiones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ curso_id: cursoId }),
    });
    const json = await r.json();
    setCargando(false);

    if (!r.ok) {
      setError(json?.error?.message ?? "No se pudo abrir");
      return;
    }

    router.push(`/aula/${json.data.id}`);
  }

  if (abierta) {
    return <span className="text-xs font-medium text-teal-700">Sesión abierta hoy</span>;
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={abrir}
        disabled={cargando}
        className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
      >
        {cargando ? "Abriendo…" : "Abrir sesión"}
      </button>
      {error ? <span className="text-xs text-rose-700">{error}</span> : null}
    </div>
  );
}
