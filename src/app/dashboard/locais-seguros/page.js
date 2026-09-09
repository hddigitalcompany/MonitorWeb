import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";

export default async function LocaisSegurosPage() {
  const supabase = createClient();
  const { data: itens } = await supabase
    .from("conteudo_locais")
    .select("*")
    .order("criado_em", { ascending: false });

  return (
    <div>
      <PageHeader title="Locais seguros" subtitle="Sugestões de lugares na região." />
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
