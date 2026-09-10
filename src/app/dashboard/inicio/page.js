import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import AtalhosInicio from "@/components/AtalhosInicio";
import { Play, RefreshCw } from "lucide-react";
import { extrairIdYoutube } from "@/lib/youtube";
import { buscarTextos, texto } from "@/lib/textos";
import { tempoRelativo, dataPorExtenso } from "@/lib/tempo";
import { registrarAcesso } from "@/lib/perfil";
import { quantidadeLiberada } from "@/lib/liberacao";

const CATEGORIAS_CONTEUDO = [
  { tabela: "conteudo_fotos", categoria: "fotos", href: "/dashboard/fotos" },
  { tabela: "conteudo_locais", categoria: "locais", href: "/dashboard/locais-seguros" },
  { tabela: "conteudo_lembretes", categoria: "lembretes", href: "/dashboard/lembretes" },
  { tabela: "conteudo_links", categoria: "links", href: "/dashboard/links-ajuda" },
  { tabela: "conteudo_wifi_dicas", categoria: "wifi", href: "/dashboard/wifi" },
  { tabela: "conteudo_contatos", categoria: "contatos", href: "/dashboard/contatos" },
];

export default async function InicioPage() {
  const supabase = createClient();
  const textos = await buscarTextos(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { primeiroLogin, ultimoAcessoAnterior } = await registrarAcesso(supabase, user.id);

  const [videos, ...conteudos] = await Promise.all([
    supabase.from("conteudo_video_dia").select("*").order("criado_em", { ascending: false }).limit(1),
    ...CATEGORIAS_CONTEUDO.map((c) => supabase.from(c.tabela).select("id")),
  ]);

  const video = videos.data?.[0];
  const idYoutube = video?.tipo === "youtube" ? extrairIdYoutube(video.url) : null;

  const agora = new Date();
  const novosPorHref = {};
  let totalNovos = 0;
  let totalLiberadoGeral = 0;

  CATEGORIAS_CONTEUDO.forEach((c, i) => {
    const total = conteudos[i].data?.length || 0;
    const liberadoAgora = quantidadeLiberada(c.categoria, primeiroLogin, agora, total);
    const liberadoAntes = quantidadeLiberada(c.categoria, primeiroLogin, ultimoAcessoAnterior, total);
    const novos = Math.max(0, liberadoAgora - liberadoAntes);
    novosPorHref[c.href] = novos;
    totalNovos += novos;
    totalLiberadoGeral += liberadoAgora;
  });

  const nomeCompleto = user.user_metadata?.full_name || user.user_metadata?.name || "";
  const primeiroNome = nomeCompleto ? nomeCompleto.split(" ")[0] : "";

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        {user.user_metadata?.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.user_metadata.avatar_url}
            alt=""
            className="h-12 w-12 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber font-extrabold text-ink">
            {(primeiroNome || "V")[0].toUpperCase()}
          </div>
        )}
        <div>
          <p className="font-extrabold tracking-tight text-lg text-ink">
            Olá{primeiroNome ? `, ${primeiroNome}` : ""} 👋
          </p>
          <p className="text-xs text-muted">{dataPorExtenso(new Date())}</p>
        </div>
      </div>

      <p className="mb-2 text-xs text-muted">Atualizações</p>
      <div className="mb-6 rounded-sm bg-amber p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="mb-0.5 text-xs font-medium text-ink/70">Atualização de conteúdo</p>
            <p className="font-extrabold tracking-tight text-3xl text-ink">
              {totalNovos > 0 ? `+${totalNovos}` : "Tudo em dia"}
            </p>
            <p className="text-xs text-ink/70">
              {totalNovos > 0 ? "novos itens liberados" : "sem novidades por enquanto"}
            </p>
          </div>
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink">
            <RefreshCw size={16} className="text-base" />
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-ink/15 pt-3">
          <div>
            <p className="text-sm font-extrabold text-ink">{tempoRelativo(ultimoAcessoAnterior)}</p>
            <p className="text-[10px] text-ink/70">desde sua última visita</p>
          </div>
          <div>
            <p className="text-sm font-extrabold text-ink">{totalLiberadoGeral}</p>
            <p className="text-[10px] text-ink/70">itens atualizados no total</p>
          </div>
        </div>
      </div>

      <PageHeader title={texto(textos, "inicio_titulo")} subtitle={texto(textos, "inicio_subtitulo")} />

      <p className="mb-2 text-xs text-muted">Vídeo do dia</p>
      {video ? (
        <div className="mb-6 overflow-hidden rounded-sm border border-border">
          {idYoutube ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${idYoutube}`}
              className="aspect-video w-full bg-surface2"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={video.legenda || "Vídeo do dia"}
            />
          ) : (
            // eslint-disable-next-line jsx-a11y/media-has-caption
            <video src={video.url} controls className="aspect-video w-full bg-surface2" />
          )}
          {video.legenda && (
            <div className="bg-surface px-3 py-2.5">
              <p className="text-sm text-ink">{video.legenda}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="mb-6 flex aspect-video items-center justify-center rounded-sm border border-border bg-surface2">
          <Play size={20} className="text-muted" />
        </div>
      )}

      <AtalhosInicio novosPorHref={novosPorHref} />
    </div>
  );
}
