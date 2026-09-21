import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import LocaisDaCidade from "@/components/LocaisDaCidade";
import { buscarTextos, texto } from "@/lib/textos";
import { registrarVisitaCategoria } from "@/lib/perfil";

export default async function LocaisSegurosPage() {
  const supabase = createClient();
  const textos = await buscarTextos(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await registrarVisitaCategoria(supabase, user.id, "locais");

  return (
    <div>
      <PageHeader title={texto(textos, "locais_titulo")} subtitle={texto(textos, "locais_subtitulo")} />

      <LocaisDaCidade textoCarregamento={texto(textos, "locais_buscando")} />

    </div>
  );
}
