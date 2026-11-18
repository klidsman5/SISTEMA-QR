import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { Badge, Button, Card, DataTable, PageTitle } from "@/components/ui";
import type { Perfil } from "@/types/database";
import { CrearUsuarioForm } from "@/features/admin/usuarios/CrearUsuarioForm";
import { ResetPasswordForm } from "@/features/admin/usuarios/ResetPasswordForm";
import { desactivarUsuario, reactivarUsuario } from "@/features/admin/usuarios/actions";

function etiquetaRol(rol: Perfil["rol"]) {
  if (rol === "administrador") return "Administrador";
  if (rol === "auxiliar_puerta") return "Auxiliar de Puerta";
  return "Docente";
}

export default async function UsuariosPage() {
  await requireRole(["administrador"]);
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("usuarios")
    .select("id, nombre, username, rol, activo, debe_cambiar_password")
    .order("rol")
    .order("nombre");

  const usuarios = (data as Perfil[]) ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Usuarios"
        subtitle="Crea y administra las cuentas de Docentes y Auxiliares de Puerta."
      />

      <Card>
        <h2 className="mb-4 text-lg font-semibold text-slate-900">Nueva cuenta</h2>
        <CrearUsuarioForm />
      </Card>

      <Card>
        <h2 className="mb-2 text-lg font-semibold text-slate-900">Cuentas registradas</h2>
        <p className="mb-4 text-sm text-slate-600">
          {usuarios.length} cuentas. El restablecimiento entrega una contraseña temporal de un solo uso.
        </p>

        <DataTable headers={["Nombre", "Usuario", "Rol", "Estado", "Acciones"]}>
          {usuarios.map((u) => (
            <tr key={u.id} className="align-top">
              <td className="px-2 py-3 font-medium text-slate-900">{u.nombre}</td>
              <td className="px-2 py-3 text-slate-600">{u.username}</td>
              <td className="px-2 py-3">
                <Badge tone={u.rol === "administrador" ? "info" : u.rol === "docente" ? "success" : "warning"}>
                  {etiquetaRol(u.rol)}
                </Badge>
              </td>
              <td className="px-2 py-3">
                <div className="flex flex-col gap-1">
                  <Badge tone={u.activo ? "success" : "danger"}>{u.activo ? "Activa" : "Inactiva"}</Badge>
                  {u.debe_cambiar_password ? <Badge tone="warning">Cambio pendiente</Badge> : null}
                </div>
              </td>
              <td className="px-2 py-3">
                <div className="flex flex-col gap-2">
                  <ResetPasswordForm id={u.id} />
                  <form action={u.activo ? desactivarUsuario : reactivarUsuario}>
                    <input type="hidden" name="id" value={u.id} />
                    <Button variant={u.activo ? "danger" : "ghost"}>
                      {u.activo ? "Desactivar" : "Reactivar"}
                    </Button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </div>
  );
}
