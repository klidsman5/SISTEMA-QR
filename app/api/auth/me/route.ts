import { NextResponse } from "next/server";
import { getPerfilActual } from "@/lib/auth/require-role";

export async function GET() {
  const perfil = await getPerfilActual();

  if (!perfil) {
    return NextResponse.json(
      { error: { code: "NO_AUTENTICADO", message: "Sin sesión" } },
      { status: 401 },
    );
  }

  return NextResponse.json({
    data: { id: perfil.id, nombre: perfil.nombre, rol: perfil.rol },
  });
}
