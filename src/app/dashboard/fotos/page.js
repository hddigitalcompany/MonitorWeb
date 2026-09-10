import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import { buscarTextos, texto } from "@/lib/textos";

export default async function FotosPage() {
  const supabase = createClient();
  const textos = await buscarTextos(supabase);
  const { data: fotos } = await supabase
    .from("conteudo_fotos")
    .select("*")
    .order("criado_em", { ascending: false });

  return (
    <div>
      <PageHeader title={texto(textos, "fotos_titulo")} subtitle={texto(textos, "fotos_subtitulo")} />
      {!fotos || fotos.length === 0 ? (
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
