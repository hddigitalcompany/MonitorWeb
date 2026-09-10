import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import ImportarConversas from "@/components/ImportarConversas";
import { buscarTextos, texto } from "@/lib/textos";

export default async function ConversasPage() {
  const supabase = createClient();
  const textos = await buscarTextos(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: conversas } = await supabase
    .from("conversas_importadas")
    .select("*")
    .eq("user_id", user.id)
    .order("criado_em", { ascending: false });

  return (
    <div>
      <PageHeader title={texto(textos, "conversas_titulo")} subtitle={texto(textos, "conversas_subtitulo")} />
      <ImportarConversas conversasIniciais={conversas || []} userId={user.id} />
    </div>
  );
}
