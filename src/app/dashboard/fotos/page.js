import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import { buscarTextos, texto } from "@/lib/textos";
import { garantirPerfilUsuario } from "@/lib/perfil";
import { quantidadeLiberada } from "@/lib/liberacao";

export default async function FotosPage() {
  const supabase = createClient();
  const textos = await buscarTextos(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const perfil = await garantirPerfilUsuario(supabase, user.id);

  const { data } = await supabase
    .from("conteudo_fotos")
    .select("*")
    .order("criado_em", { ascending: true })
    .order("id", { ascending: true });

  const todas = data || [];
  const liberadas = quantidadeLiberada("fotos", perfil.primeiro_login, new Date(), todas.length);
  const fotos = todas.slice(0, liberadas).reverse();

  return (
    <div>
      <PageHeader title={texto(textos, "fotos_titulo")} subtitle={texto(textos, "fotos_subtitulo")} />
      {fotos.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma foto publicada ainda.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {fotos.map((foto) => (
            <div key={foto.id} className="aspect-square overflow-hidden rounded-sm border border-border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={foto.url} alt="" className="h-full w-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
