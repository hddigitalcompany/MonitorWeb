import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";

export default async function WifiPage() {
  const supabase = createClient();
  const { data: dicas } = await supabase
    .from("conteudo_wifi_dicas")
    .select("*")
    .order("criado_em", { ascending: false });

  return (
    <div>
      <PageHeader title="Wifi" subtitle="Dicas de segurança em redes públicas." />
      {!dicas || dicas.length === 0 ? (
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
