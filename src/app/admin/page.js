import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/admin/AdminDashboard";

async function buscarClientes(supabase) {
  const { data: listaAdmins } = await supabase.from("admins").select("user_id");
  const idsAdmins = new Set((listaAdmins || []).map((a) => a.user_id));

  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (error) throw error;

    const clientes = (data?.users || [])
      .filter((u) => !idsAdmins.has(u.id))
      .map((u) => ({
        id: u.id,
        email: u.email,
        nome: u.user_metadata?.full_name || u.user_metadata?.name || "",
        avatarUrl: u.user_metadata?.avatar_url || null,
        criadoEm: new Date(u.created_at).toLocaleDateString("pt-BR"),
      }))
      .sort((a, b) => (a.nome || a.email).localeCompare(b.nome || b.email));

    return { clientes, erroConfig: false };
  } catch (err) {
    console.error('[admin/clientes] erro ao buscar clientes:', err?.message || err);
    return { clientes: [], erroConfig: true };
  }
}

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

  const [
    fotos,
    videos,
    locais,
    lembretes,
    links,
    wifiDicas,
    contatos,
    textos,
    chamados,
    { clientes, erroConfig },
  ] = await Promise.all([
    supabase.from("conteudo_fotos").select("*").order("criado_em", { ascending: false }),
    supabase.from("conteudo_video_dia").select("*").order("criado_em", { ascending: false }),
    supabase.from("conteudo_locais").select("*").order("criado_em", { ascending: false }),
    supabase.from("conteudo_lembretes").select("*").order("criado_em", { ascending: false }),
    supabase.from("conteudo_links").select("*").order("criado_em", { ascending: false }),
    supabase.from("conteudo_wifi_dicas").select("*").order("criado_em", { ascending: false }),
    supabase.from("conteudo_contatos").select("*").order("criado_em", { ascending: false }),
    supabase.from("conteudo_textos").select("*"),
    supabase
      .from("chamados_suporte")
      .select("*, mensagens_suporte(*)")
      .order("criado_em", { ascending: false }),
    buscarClientes(supabase),
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
        textos: textos.data || [],
        chamados: chamados.data || [],
        clientes,
        erroClientes: erroConfig,
      }}
    />
  );
}
