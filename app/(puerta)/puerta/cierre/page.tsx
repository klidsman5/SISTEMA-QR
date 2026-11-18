import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getPerfilActual } from "@/lib/auth/require-role";
import { Card, PageTitle } from "@/components/ui";
import { CloseDayForm } from "@/features/puerta/CloseDayForm";

export default async function CierrePage() {
  const perfil = await getPerfilActual();
  if (perfil?.rol !== "administrador") redirect("/puerta/registros");

  const supabase = await createSupabaseServerClient();
  const { data: turnos } = await supabase
    .from("turnos")
    .select("id, nombre, hora_cierre")
    .order("nombre");

  const hoy = new Date().toISOString().slice(0, 10);

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Cierre de jornada"
        subtitle="Asigna falta a los alumnos del turno que no registraron entrada. Es idempotente."
      />
      <Card>
        <CloseDayForm turnos={(turnos ?? []) as Array<{ id: string; nombre: string; hora_cierre: string }>} fecha={hoy} />
      </Card>
    </div>
  );
}
