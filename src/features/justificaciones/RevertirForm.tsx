"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RevertirForm({ id }: { id: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function revertir() {
    const motivo = prompt("Motivo de la reversión:");
    if (!motivo || motivo.trim().length < 3) return;

    const r = await fetch(`/api/justificaciones/${id}/revertir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo }),
    });
    const json = await r.json();
    if (!r.ok) {
      setError(json?.error?.message ?? "No se pudo revertir");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={revertir}
        className="rounded-lg border border-rose-200 bg-rose-50 px-2 py-1 text-xs text-rose-700 hover:bg-rose-100"
      >
        Revertir
      </button>
      {error ? <span className="text-xs text-rose-700">{error}</span> : null}
    </div>
  );
}
