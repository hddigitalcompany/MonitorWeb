import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import AtalhosInicio from "@/components/AtalhosInicio";
import { Play } from "lucide-react";
import { extrairIdYoutube } from "@/lib/youtube";
import { buscarTextos, texto } from "@/lib/textos";

export default async function InicioPage() {
  const supabase = createClient();
  const textos = await buscarTextos(supabase);

  const { data: videos } = await supabase
    .from("conteudo_video_dia")
    .select("*")
    .order("criado_em", { ascending: false })
    .limit(1);

  const video = videos?.[0];
  const idYoutube = video?.tipo === "youtube" ? extrairIdYoutube(video.url) : null;

  return (
    <div>
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

      <AtalhosInicio />
    </div>
  );
}
