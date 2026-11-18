import { loginAction } from "@/features/auth/actions";

const errores: Record<string, string> = {
  datos: "Completa usuario y contraseña.",
  credenciales: "Usuario o contraseña incorrectos.",
  "cuenta-inactiva": "La cuenta está desactivada. Contacta al Administrador.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; cambiada?: string }>;
}) {
  const params = await searchParams;
  const error = params.error ? errores[params.error] ?? "No se pudo iniciar sesión." : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-widest text-indigo-600">Asistencia QR</p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">Iniciar sesión</h1>
          <p className="mt-2 text-sm text-slate-600">
            Acceso para Administrador, Auxiliar de Puerta y Docente.
          </p>
        </div>

        {error ? (
          <p className="mb-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}
        {params.cambiada ? (
          <p className="mb-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Contraseña actualizada. Vuelve a iniciar sesión.
          </p>
        ) : null}

        <form action={loginAction} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Usuario</span>
            <input
              name="username"
              autoComplete="username"
              required
              className="rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700">Contraseña</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="rounded-lg border border-slate-300 px-3 py-2 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
            />
          </label>

          <button className="mt-2 rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white hover:bg-indigo-700">
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
}
