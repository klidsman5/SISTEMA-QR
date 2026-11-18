import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { logoutAction } from "@/features/auth/actions";
import { Badge } from "@/components/ui";
import { SyncIndicator } from "@/components/SyncIndicator";

const enlaces = [
  { href: "/admin/usuarios", label: "Usuarios" },
  { href: "/admin/estructura", label: "Estructura" },
  { href: "/admin/padron", label: "Padrón" },
  { href: "/admin/credenciales", label: "Credenciales" },
  { href: "/admin/horarios", label: "Horarios" },
  { href: "/admin/reportes", label: "Reportes" },
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/justificaciones", label: "Justificaciones" },
  { href: "/admin/auditoria", label: "Auditoría" },
  { href: "/admin/configuracion", label: "Configuración" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const perfil = await requireRole(["administrador"]);

  return (
    <div className="min-h-screen">
      <header className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 px-6 py-4 text-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-indigo-100">Asistencia QR</p>
            <h1 className="text-lg font-semibold">Panel administrativo</h1>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <SyncIndicator />
            <Badge tone="info">{perfil.nombre}</Badge>
            <form action={logoutAction}>
              <button className="rounded-lg border border-white/40 px-3 py-1.5 text-white hover:bg-white/10">
                Salir
              </button>
            </form>
          </div>
        </div>
      </header>

      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4">
          {enlaces.map((e) => (
            <Link
              key={e.href}
              href={e.href}
              className="border-b-2 border-transparent px-4 py-3 text-sm font-medium text-slate-600 hover:border-indigo-500 hover:text-indigo-700"
            >
              {e.label}
            </Link>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
