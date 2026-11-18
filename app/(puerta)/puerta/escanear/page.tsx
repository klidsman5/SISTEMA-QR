import { PageTitle } from "@/components/ui";
import { ScanClient } from "@/features/puerta/ScanClient";

export default function EscanearPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle title="Registrar entrada" subtitle="Escanea la credencial o registra manualmente por DNI." />
      <ScanClient />
    </div>
  );
}
