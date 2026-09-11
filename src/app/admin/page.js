import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/admin/AdminDashboard";

async function buscarClientesEUsuarios(supabase, idsAdminsArray) {
  const idsAdmins = new Set(idsAdminsArray || []);

  try {
    const supabaseAdmin = createAdminClient();
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ perPage: 200 });
    if (error) throw error;

    const usuarios = data?.users || [];
    const mapaUsuarios = new Map(
      usuarios.map((u) => [
        u.id,
        { nome: u.user_metadata?.full_name || u.user_metadata?.name || "", email: u.email },
      ])
    );

    const clientes = usuarios
      .filter((u) => !idsAdmins.has(u.id))
      .map((u) => ({
        id: u.id,
        email: u.email,
        nome: u.user_metadata?.full_name || u.user_metadata?.name || "",
        avatarUrl: u.user_metadata?.avatar_url || null,
        criadoEm: new Date(u.created_at).toLocaleDateString("pt-BR"),
        criadoEmIso: u.created_at,
      }))
      .sort((a, b) => (a.nome || a.email).localeCompare(b.nome || b.email));

    return { clientes, mapaUsuarios, erroConfig: false };
  } catch (err) {
    console.error('[admin/clientes] erro ao buscar clientes:', err?.message || err);
    return { clientes: [], mapaUsuarios: new Map(), erroConfig: true };
  }
}

async function buscarEventosVisita(supabase, idsAdmins, desde) {
  try {
    let consulta = supabase
      .from("eventos_visita")
      .select("user_id, rota, criado_em")
      .gte("criado_em", desde)
      .order("criado_em", { ascending: true })
      .limit(20000);

    if (idsAdmins.length > 0) {
      consulta = consulta.not("user_id", "in", `(${idsAdmins.join(",")})`);
    }

    const { data, error } = await consulta;
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error("[admin/painel] erro ao buscar eventos de visita:", err?.message || err);
    return [];
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
          <p className="font-extrabold tracking-tight text-2xl text-ink">Acesso restrito</p>
          <p className="mt-2 text-sm text-muted">
            Essa área é só para administradores do app.
          </p>
        </div>
      </main>
    );
  }

  const { data: listaAdmins } = await supabase.from("admins").select("user_id");
  const idsAdmins = (listaAdmins || []).map((a) => a.user_id);
  const desde32Dias = new Date(Date.now() - 32 * 24 * 60 * 60 * 1000).toISOString();

  const [
    fotos,
    videos,
    locais,
    lembretes,
    links,
    wifiDicas,
    contatos,
    textos,
    ajudaRapida,
    chamados,
    pedidosReembolso,
    { clientes, mapaUsuarios, erroConfig },
    eventosVisita,
  ] = await Promise.all([
    supabase.from("conteudo_fotos").select("*").order("criado_em", { ascending: false }),
    supabase.from("conteudo_video_dia").select("*").order("criado_em", { ascending: false }),
    supabase.from("conteudo_locais").select("*").order("criado_em", { ascending: false }),
    supabase.from("conteudo_lembretes").select("*").order("criado_em", { ascending: false }),
    supabase.from("conteudo_links").select("*").order("criado_em", { ascending: false }),
    supabase.from("conteudo_wifi_dicas").select("*").order("criado_em", { ascending: false }),
    supabase.from("conteudo_contatos").select("*").order("criado_em", { ascending: false }),
    supabase.from("conteudo_textos").select("*"),
    supabase.from("conteudo_ajuda_rapida").select("*").order("criado_em", { ascending: true }),
    supabase
      .from("chamados_suporte")
      .select("*, mensagens_suporte(*)")
      .order("criado_em", { ascending: false }),
    supabase.from("pedidos_reembolso").select("*").order("criado_em", { ascending: false }),
    buscarClientesEUsuarios(supabase, idsAdmins),
    buscarEventosVisita(supabase, idsAdmins, desde32Dias),
  ]);

  const reembolsos = (pedidosReembolso.data || []).map((p) => {
    const info = mapaUsuarios.get(p.user_id);
    return {
      ...p,
      nome: info?.nome || "",
      email: info?.email || "Conta removida",
    };
  });

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
        ajudaRapida: ajudaRapida.data || [],
        chamados: chamados.data || [],
        clientes,
        erroClientes: erroConfig,
        reembolsos,
        eventosVisita,
        idsAdmins,
      }}
    />
  );
}
