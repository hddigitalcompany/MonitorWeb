import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import { buscarTextos, texto } from "@/lib/textos";
import { garantirPerfilUsuario } from "@/lib/perfil";
import { quantidadeLiberada } from "@/lib/liberacao";

export default async function LocaisSegurosPage() {
  const supabase = createClient();
  const textos = await buscarTextos(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const perfil = await garantirPerfilUsuario(supabase, user.id);

  const { data } = await supabase
    .from("conteudo_locais")
    .select("*")
    .order("criado_em", { ascending: true })
    .order("id", { ascending: true });

  const todos = data || [];
  const liberados = quantidadeLiberada("locais", perfil.primeiro_login, new Date(), todos.length);
  const itens = todos.slice(0, liberados).reverse();

  return (
    <div>
      <PageHeader title={texto(textos, "locais_titulo")} subtitle={texto(textos, "locais_subtitulo")} />
      {itens.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma sugestão publicada ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {itens.map((item) => (
            <div key={item.id} className="rounded-sm border border-border bg-surface p-3">
              <p className="text-sm leading-relaxed text-ink">{item.texto}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
