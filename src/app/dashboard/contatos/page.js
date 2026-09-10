import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import { buscarTextos, texto } from "@/lib/textos";

export default async function ContatosPage() {
  const supabase = createClient();
  const textos = await buscarTextos(supabase);
  const { data: contatos } = await supabase
    .from("conteudo_contatos")
    .select("*")
    .order("criado_em", { ascending: false });

  return (
    <div>
      <PageHeader title={texto(textos, "contatos_titulo")} subtitle={texto(textos, "contatos_subtitulo")} />
      {!contatos || contatos.length === 0 ? (
        <p className="text-sm text-muted">Nenhum contato publicado ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {contatos.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between gap-2 rounded-sm border border-border bg-surface p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">{c.nome}</p>
                <p className="text-xs text-muted">{c.categoria}</p>
              </div>
              <p className="shrink-0 text-sm text-amber">{c.numero}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
