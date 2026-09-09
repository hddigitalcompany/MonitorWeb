import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/admin/AdminDashboard";

export default async function AdminPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: souAdmin } = await supabase
    .from("admins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!souAdmin) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <p className="font-serif text-2xl text-ink">Acesso restrito</p>
          <p className="mt-2 text-sm text-muted">
            Essa área é só para administradores do app.
          </p>
        </div>
      </main>
    );
  }

  const [fotos, videos, locais, lembretes, links, wifiDicas, contatos, chamados] = await Promise.all([
    supabase.from("conteudo_fotos").select("*").order("criado_em", { ascending: false }),
    supabase.from("conteudo_video_dia").select("*").order("criado_em", { ascending: false }),
    supabase.from("conteudo_locais").select("*").order("criado_em", { ascending: false }),
    supabase.from("conteudo_lembretes").select("*").order("criado_em", { ascending: false }),
    supabase.from("conteudo_links").select("*").order("criado_em", { ascending: false }),
    supabase.from("conteudo_wifi_dicas").select("*").order("criado_em", { ascending: false }),
    supabase.from("conteudo_contatos").select("*").order("criado_em", { ascending: false }),
    supabase
      .from("chamados_suporte")
      .select("*, mensagens_suporte(*)")
      .order("criado_em", { ascending: false }),
  ]);

  return (
    <AdminDashboard
      dadosIniciais={{
        fotos: fotos.data || [],
        videos: videos.data || [],
        locais: locais.data || [],
        lembretes: lembretes.data || [],
        links: links.data || [],
        wifiDicas: wifiDicas.data || [],
        contatos: contatos.data || [],
        chamados: chamados.data || [],
      }}
    />
  );
}
