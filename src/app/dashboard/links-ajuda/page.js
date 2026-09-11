import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import { buscarTextos, texto } from "@/lib/textos";
import { garantirPerfilUsuario, registrarVisitaCategoria } from "@/lib/perfil";
import { quantidadeLiberada, dataDeLiberacao } from "@/lib/liberacao";
import { formatarHora } from "@/lib/tempo";
import { Link2 } from "lucide-react";

export default async function LinksAjudaPage() {
  const supabase = createClient();
  const textos = await buscarTextos(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const perfil = await garantirPerfilUsuario(supabase, user.id);
  await registrarVisitaCategoria(supabase, user.id, "links");

  const { data } = await supabase
    .from("conteudo_links")
    .select("*")
    .order("criado_em", { ascending: true })
    .order("id", { ascending: true });

  const todos = data || [];
  const liberados = quantidadeLiberada("links", perfil.primeiro_login, new Date(), todos.length);
  const itens = todos
    .slice(0, liberados)
    .map((item, indice) => ({
      ...item,
      horarioLiberado: dataDeLiberacao("links", perfil.primeiro_login, indice),
    }))
    .reverse();

  return (
    <div>
      <PageHeader title={texto(textos, "links_titulo")} subtitle={texto(textos, "links_subtitulo")} />
      {itens.length === 0 ? (
        <p className="text-sm text-muted">Nenhum link publicado ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {itens.map((item) => {
            const Conteudo = (
              <>
                <div className="flex items-start gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber">
                    <Link2 size={14} className="text-ink" strokeWidth={2.5} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold leading-relaxed text-ink">{item.texto}</p>
                      <span className="shrink-0 pt-0.5 text-[10px] text-muted">
                        {formatarHora(item.horarioLiberado)}
                      </span>
                    </div>
                    {item.url && (
                      <p className="mt-0.5 truncate text-xs text-ink">{item.url}</p>
                    )}
                  </div>
                </div>
              </>
            );

            return item.url ? (
              <a
                key={item.id}
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-sm border border-border bg-surface p-3"
              >
                {Conteudo}
              </a>
            ) : (
              <div key={item.id} className="rounded-sm border border-border bg-surface p-3">
                {Conteudo}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
