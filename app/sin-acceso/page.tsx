import Link from "next/link";

export default function SinAccesoPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Sin acceso</h1>
        <p className="mt-2 text-sm text-slate-600">
          Tu rol no tiene permiso para esta sección.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
