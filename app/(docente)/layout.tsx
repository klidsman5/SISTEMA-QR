import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { logoutAction } from "@/features/auth/actions";
import { Badge } from "@/components/ui";
import { SyncIndicator } from "@/components/SyncIndicator";

export default async function DocenteLayout({ children }: { children: React.ReactNode }) {
  const perfil = await requireRole(["docente", "administrador"]);

  return (
    <div className="min-h-screen">
      <header className="bg-gradient-to-r from-teal-600 via-emerald-600 to-teal-500 px-6 py-4 text-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-teal-100">Asistencia QR</p>
            <h1 className="text-lg font-semibold">Aula</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <SyncIndicator />
            <Badge tone="success">{perfil.nombre}</Badge>
            <form action={logoutAction}>
              <button className="rounded-lg border border-white/40 px-3 py-1.5 hover:bg-white/10">Salir</button>
            </form>
          </div>
        </div>
      </header>

      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl gap-1 px-4">
          <Link href="/aula" className="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-600 hover:border-teal-500 hover:text-teal-700">
            Mis cursos
          </Link>
          <Link href="/aula/justificaciones" className="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-600 hover:border-teal-500 hover:text-teal-700">
            Justificaciones
          </Link>
          <Link href="/aula/reportes" className="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-600 hover:border-teal-500 hover:text-teal-700">
            Reportes
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
