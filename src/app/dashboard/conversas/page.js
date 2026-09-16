import { createClient } from "@/lib/supabase/server";
import PageHeader from "@/components/PageHeader";
import ImportarConversas from "@/components/ImportarConversas";
import ConversasDemo from "@/components/ConversasDemo";
import ConversasReais from "@/components/ConversasReais";
import { extrairIdYoutube } from "@/lib/youtube";
import { buscarTextos, texto } from "@/lib/textos";
import { garantirPerfilUsuario } from "@/lib/perfil";
import { conversaLiberada } from "@/lib/liberacaoConversa";

export default async function ConversasPage() {
  const supabase = createClient();
  const textos = await buscarTextos(supabase);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: conversas }, { data: videos }, { data: conversasDemo }] = await Promise.all([
    supabase
      .from("conversas_importadas")
      .select("*")
      .eq("user_id", user.id)
      .order("criado_em", { ascending: false }),
    supabase.from("conteudo_video_conversas").select("*").order("criado_em", { ascending: false }).limit(1),
    supabase
      .from("conversas_demo")
      .select("*")
      .order("horas_liberacao", { ascending: true, nullsFirst: false })
      .order("criado_em", { ascending: false }),
  ]);

  const perfil = await garantirPerfilUsuario(supabase, user.id);
  const conversasDemoLiberadas = (conversasDemo || []).filter((c) =>
    conversaLiberada(c.horas_liberacao, perfil.primeiro_login)
  );

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

      <ConversasReais userId={user.id} textos={textos} />

      <ConversasDemo conversas={conversasDemoLiberadas} userId={user.id} textos={textos} />

      <ImportarConversas conversasIniciais={conversas || []} userId={user.id} />
    </div>
  );
}
