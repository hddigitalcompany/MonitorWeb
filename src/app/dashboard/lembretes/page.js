import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";

export default async function LembretesPage() {
  const supabase = createClient();
  const { data } = await supabase
    .from("conteudo_lembretes")
    .select("*")
    .order("criado_em", { ascending: false });

  const itens = (data || []).slice().sort((a, b) => {
    if (!a.hora && !b.hora) return 0;
    if (!a.hora) return 1;
    if (!b.hora) return -1;
    return a.hora.localeCompare(b.hora);
  });

  return (
    <div>
      <PageHeader title="Lembretes" subtitle="Lembretes de ligar pra alguém importante." />
      {itens.length === 0 ? (
        <p className="text-sm text-muted">Nenhum lembrete publicado ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {itens.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-sm border border-border bg-surface p-3">
              {item.hora && (
                <span className="shrink-0 rounded-sm bg-amber/20 px-2 py-1 text-xs font-medium text-ink">
                  {item.hora}
                </span>
              )}
              <p className="text-sm leading-relaxed text-ink">{item.atividade || item.texto}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
