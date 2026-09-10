import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import { buscarTextos, texto } from "@/lib/textos";

export default async function LocaisSegurosPage() {
  const supabase = createClient();
  const textos = await buscarTextos(supabase);
  const { data: itens } = await supabase
    .from("conteudo_locais")
    .select("*")
    .order("criado_em", { ascending: false });

  return (
    <div>
      <PageHeader title={texto(textos, "locais_titulo")} subtitle={texto(textos, "locais_subtitulo")} />
      {!itens || itens.length === 0 ? (
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
