import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";

export default async function LinksAjudaPage() {
  const supabase = createClient();
  const { data: itens } = await supabase
    .from("conteudo_links")
    .select("*")
    .order("criado_em", { ascending: false });

  return (
    <div>
      <PageHeader title="Links de ajuda" subtitle="Conteúdos úteis selecionados." />
      {!itens || itens.length === 0 ? (
        <p className="text-sm text-muted">Nenhum link publicado ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {itens.map((item) =>
            item.url ? (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-sm border border-border bg-surface p-3"
              >
                <p className="text-sm leading-relaxed text-amber">{item.texto}</p>
              </a>
            ) : (
              <div key={item.id} className="rounded-sm border border-border bg-surface p-3">
                <p className="text-sm leading-relaxed text-ink">{item.texto}</p>
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
}
