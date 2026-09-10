import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import { buscarTextos, texto } from "@/lib/textos";

export default async function AssinaturaPage() {
  const supabase = createClient();
  const textos = await buscarTextos(supabase);

  return (
    <div>
      <PageHeader title={texto(textos, "assinatura_titulo")} />
      <p className="text-sm text-muted">Em breve.</p>
    </div>
  );
}
