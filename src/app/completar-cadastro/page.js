import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { garantirPerfilUsuario } from "@/lib/perfil";
import CompletarCadastro from "@/components/CompletarCadastro";

export default async function CompletarCadastroPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const perfil = await garantirPerfilUsuario(supabase, user.id);
  if (perfil.telefone) redirect("/dashboard/inicio");

  const nomeInicial = user.user_metadata?.full_name || user.user_metadata?.name || "";

  return <CompletarCadastro nomeInicial={nomeInicial} />;
}
