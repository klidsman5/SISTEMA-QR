import { cambiarPasswordAction } from "@/features/auth/actions";

const errores: Record<string, string> = {
  corta: "La contraseña debe tener al menos 8 caracteres.",
  distintas: "Las contraseñas no coinciden.",
  actualizar: "No se pudo actualizar la contraseña.",
};

export default async function CambiarPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const error = params.error ? errores[params.error] ?? "Error al cambiar la contraseña." : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-900">Cambia tu contraseña</h1>
        <p className="mt-2 text-sm text-slate-600">
          Tu contraseña fue restablecida. Define una nueva para continuar.
        </p>

        {error ? (
          <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}

        <form action={cambiarPasswordAction} className="mt-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Nueva contraseña</span>
            <input
              name="password"
              type="password"
              minLength={8}
              required
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Confirma la contraseña</span>
            <input
              name="confirmacion"
              type="password"
              minLength={8}
              required
              className="rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>

          <button className="rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700">
            Guardar
          </button>
        </form>
      </div>
    </div>
  );
}
