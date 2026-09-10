import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import Suporte from "@/components/Suporte";
import { buscarTextos, texto } from "@/lib/textos";

export default async function SuportePage() {
  const supabase = createClient();
  const textos = await buscarTextos(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: chamados } = await supabase
    .from("chamados_suporte")
    .select("*, mensagens_suporte(*)")
    .eq("user_id", user.id)
    .order("criado_em", { ascending: false });

  const { data: ajudaRapida } = await supabase
    .from("conteudo_ajuda_rapida")
    .select("*")
    .order("criado_em", { ascending: true });

  const { data: pedidosReembolso } = await supabase
    .from("pedidos_reembolso")
    .select("*")
    .eq("user_id", user.id)
    .order("criado_em", { ascending: false })
    .limit(1);

  const nomeCompleto = user.user_metadata?.full_name || user.user_metadata?.name || "";
  const nomeUsuario = nomeCompleto ? nomeCompleto.split(" ")[0] : "você";

  return (
    <div>
      <PageHeader title={texto(textos, "suporte_titulo")} subtitle={texto(textos, "suporte_subtitulo")} />
      <Suporte
        chamadosIniciais={chamados || []}
        userId={user.id}
        ajudaRapidaIniciais={ajudaRapida || []}
        nomeUsuario={nomeUsuario}
        pedidoReembolsoInicial={pedidosReembolso?.[0] || null}
      />
    </div>
  );
}
