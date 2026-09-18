import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { garantirPerfilUsuario } from "@/lib/perfil";
import { buscarTextos } from "@/lib/textos";
import Carregando from "@/components/Carregando";

const ETAPA_PADRAO = [
  { id: "padrao", frase: "Carregando...", frase_concluida: "", duracao_segundos: 1.5, ordem: 1 },
];

export default async function CarregandoPage({ searchParams }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const perfil = await garantirPerfilUsuario(supabase, user.id);
  if (!perfil.telefone) redirect("/completar-cadastro");

  const preview = searchParams?.preview === "1";

  const { data: etapasBrutas } = await supabase
    .from("conteudo_carregamento_etapas")
    .select("id, frase, frase_concluida, duracao_segundos, ordem")
    .order("ordem", { ascending: true });

  const etapas = etapasBrutas && etapasBrutas.length > 0 ? etapasBrutas : ETAPA_PADRAO;
  const textos = await buscarTextos(supabase);

  return (
    <Carregando
      telefoneInicial={perfil.telefone}
      telefoneConfirmadoInicial={perfil.telefone_confirmado}
      etapas={etapas}
      textos={textos}
      preview={preview}
    />
  );
}
