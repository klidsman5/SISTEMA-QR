import { redirect } from "next/navigation";
import { getPerfilActual, homePorRol } from "@/lib/auth/require-role";

export default async function HomePage() {
  const perfil = await getPerfilActual();

  if (!perfil) redirect("/login");
  if (!perfil.activo) redirect("/login?error=cuenta-inactiva");
  if (perfil.debe_cambiar_password) redirect("/cambiar-password");

  redirect(homePorRol(perfil.rol));
}
