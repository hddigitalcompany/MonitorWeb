import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import { buscarTextos, texto } from "@/lib/textos";
import { garantirPerfilUsuario } from "@/lib/perfil";
import { quantidadeLiberada } from "@/lib/liberacao";

export default async function WifiPage() {
  const supabase = createClient();
  const textos = await buscarTextos(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const perfil = await garantirPerfilUsuario(supabase, user.id);

  const { data } = await supabase
    .from("conteudo_wifi_dicas")
    .select("*")
    .order("criado_em", { ascending: true })
    .order("id", { ascending: true });

  const todas = data || [];
  const liberadas = quantidadeLiberada("wifi", perfil.primeiro_login, new Date(), todas.length);
  const dicas = todas.slice(0, liberadas).reverse();

  return (
    <div>
      <PageHeader title={texto(textos, "wifi_titulo")} subtitle={texto(textos, "wifi_subtitulo")} />
      {dicas.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma dica publicada ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {dicas.map((dica) => (
            <div key={dica.id} className="rounded-sm border border-border bg-surface p-3">
              <p className="mb-1 text-sm text-ink">{dica.titulo}</p>
              <p className="text-xs leading-relaxed text-muted">{dica.texto}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
