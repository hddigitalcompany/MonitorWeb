import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import ImportarConversas from "@/components/ImportarConversas";
import { extrairIdYoutube } from "@/lib/youtube";
import { buscarTextos, texto } from "@/lib/textos";

export default async function ConversasPage() {
  const supabase = createClient();
  const textos = await buscarTextos(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: conversas }, { data: videos }] = await Promise.all([
    supabase
      .from("conversas_importadas")
      .select("*")
      .eq("user_id", user.id)
      .order("criado_em", { ascending: false }),
    supabase.from("conteudo_video_conversas").select("*").order("criado_em", { ascending: false }).limit(1),
  ]);

  const video = videos?.[0];
  const idYoutube = video?.tipo === "youtube" ? extrairIdYoutube(video.url) : null;

  return (
    <div>
      <PageHeader title={texto(textos, "conversas_titulo")} subtitle={texto(textos, "conversas_subtitulo")} />

      {video && (
        <div className="mb-6 overflow-hidden rounded-sm border border-border">
          {idYoutube ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${idYoutube}`}
              className="aspect-video w-full bg-surface2"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title={video.legenda || "Como importar suas conversas"}
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
      )}

      <ImportarConversas conversasIniciais={conversas || []} userId={user.id} />
    </div>
  );
}
