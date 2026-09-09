import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import ImportarConversas from "@/components/ImportarConversas";

export default async function ConversasPage() {
  const supabase = createClient();
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
      <PageHeader title="Conversas" subtitle="Importe, se você quiser, organizadas por pessoa." />
      <ImportarConversas conversasIniciais={conversas || []} userId={user.id} />
    </div>
  );
}
