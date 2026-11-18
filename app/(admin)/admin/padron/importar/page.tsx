import Link from "next/link";
import { requireRole } from "@/lib/auth/require-role";
import { Card, PageTitle } from "@/components/ui";
import { ImportForm } from "@/features/admin/padron/ImportForm";

export default async function ImportarPage() {
  await requireRole(["administrador"]);
  const anio = new Date().getFullYear();

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Importar padrón"
        subtitle="Archivo CSV o XLSX con las columnas dni, nombres, apellidos, grado y seccion."
      />

      <Card>
        <ImportForm anio={anio} />

        <div className="mt-6 rounded-lg bg-slate-50 p-4 text-xs text-slate-600">
          <p className="font-medium text-slate-700">Formato esperado</p>
          <pre className="mt-2 overflow-x-auto">
{`dni,nombres,apellidos,grado,seccion
70123456,Ana Lucía,Torres Ríos,3ro,B
70123457,Luis,Quispe Mamani,3ro,A`}
          </pre>
          <p className="mt-2">
            Se aceptan acentos y UTF-8. El grado y la sección deben existir previamente en{" "}
            <Link className="font-medium text-indigo-700 underline" href="/admin/estructura">
              Estructura
            </Link>
            .
          </p>
        </div>
      </Card>
    </div>
  );
}
