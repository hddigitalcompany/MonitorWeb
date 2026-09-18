import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { garantirPerfilUsuario } from "@/lib/perfil";
import { buscarTextos } from "@/lib/textos";
import CompletarCadastro from "@/components/CompletarCadastro";

export default async function CompletarCadastroPage({ searchParams }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  // A prévia do admin (aba Textos > "Completar cadastro") abre essa
  // página mesmo pra quem já preencheu o telefone, só pra poder olhar
  // como ela fica — por isso o "?preview=1" pula esse redirecionamento.
  const preview = searchParams?.preview === "1";
  const perfil = await garantirPerfilUsuario(supabase, user.id);
  if (perfil.telefone && !preview) redirect("/dashboard/inicio");

  const nomeInicial = user.user_metadata?.full_name || user.user_metadata?.name || "";
  const textos = await buscarTextos(supabase);

  return <CompletarCadastro nomeInicial={nomeInicial} textos={textos} />;
}
