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

  return (
    <div>
      <PageHeader title={texto(textos, "suporte_titulo")} subtitle={texto(textos, "suporte_subtitulo")} />
      <Suporte chamadosIniciais={chamados || []} userId={user.id} />
    </div>
  );
}
