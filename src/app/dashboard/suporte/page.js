import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import Suporte from "@/components/Suporte";

export default async function SuportePage() {
  const supabase = createClient();
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
      <PageHeader title="Suporte" subtitle="Abra um chamado ou continue uma conversa." />
      <Suporte chamadosIniciais={chamados || []} userId={user.id} />
    </div>
  );
}
