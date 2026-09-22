import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import AdminDashboard from "@/components/admin/AdminDashboard";

// O Next.js guarda em cache o resultado de cada busca (fetch) por padrão,
// então sem isso aqui o painel podia continuar mostrando dados antigos —
// tipo uma conta criada agora ainda não contando em "Hoje" — até o cache
// vencer sozinho. Essa linha força sempre buscar tudo de novo na hora.
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

async function buscarClientesEUsuarios(supabase, idsAdminsArray) {
  const idsAdmins = new Set(idsAdminsArray || []);

  try {
    const supabaseAdmin = createAdminClient();

    // O Supabase devolve os usuários paginados (200 por página aqui). Se a
    // gente só pedir a primeira página, quem se cadastrou depois do
    // usuário #200 nunca aparece. Por isso busca página por página até
    // vir uma página vazia — assim pega todo mundo, não importa quantos
    // sejam.
    const usuarios = [];
    let pagina = 1;
    const tamanhoPagina = 200;
    // Limite de segurança pra nunca ficar num loop infinito por engano.
    for (let tentativas = 0; tentativas < 200; tentativas++) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({
        page: pagina,
        perPage: tamanhoPagina,
      });
      if (error) throw error;
      const pageUsuarios = data?.users || [];
      usuarios.push(...pageUsuarios);
      if (pageUsuarios.length < tamanhoPagina) break;
      pagina += 1;
    }
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

    const resultadosLogin = usuarios.flatMap((u) => {
      const historico = u.app_metadata?.historico_login_visitante;
      if (!Array.isArray(historico)) return [];
      return historico
        .filter(
          (item) =>
            item &&
            typeof item.visitante_id === "string" &&
            (item.resultado === "conta_criada" || item.resultado === "conta_existente") &&
            typeof item.criado_em === "string"
        )
        .map((item) => ({ ...item, user_id: u.id }));
    });

    return { clientes, mapaUsuarios, resultadosLogin, erroConfig: false };
  } catch (err) {
    console.error('[admin/clientes] erro ao buscar clientes:', err?.message || err);
    return { clientes: [], mapaUsuarios: new Map(), resultadosLogin: [], erroConfig: true };
  }
}

async function buscarEventosVisita(supabase, idsAdmins, desde) {
  try {
    // O Supabase tem um teto de quantas linhas devolve de uma vez só
    // (configurado lá no projeto), então pedir .limit(20000) não garante
    // vir 20000 — pode vir bem menos, sem avisar. Por isso busca em
    // fatias com .range(), avançando pelo tanto que realmente voltou a
    // cada vez, até vir uma fatia vazia.
    const eventos = [];
    let inicio = 0;
    const tamanhoFatia = 1000;
    for (let tentativas = 0; tentativas < 200; tentativas++) {
      let consulta = supabase
        .from("eventos_visita")
        .select("user_id, rota, criado_em, ip")
        .gte("criado_em", desde)
        .order("criado_em", { ascending: true })
        .range(inicio, inicio + tamanhoFatia - 1);

      if (idsAdmins.length > 0) {
        consulta = consulta.not("user_id", "in", `(${idsAdmins.join(",")})`);
      }

      const { data, error } = await consulta;
      if (error) throw error;
      const fatia = data || [];
      eventos.push(...fatia);
      if (fatia.length < tamanhoFatia) break;
      inicio += fatia.length;
    }
    return eventos;
  } catch (err) {
    console.error("[admin/painel] erro ao buscar eventos de visita:", err?.message || err);
    return [];
  }
}

async function buscarVisitasLogin(supabase, desde) {
  try {
    // Mesma lógica de fatiar com .range() explicada em cima, em
    // buscarEventosVisita — evita o teto de linhas do Supabase esconder
    // visitas mais recentes.
    const visitas = [];
    let inicio = 0;
    const tamanhoFatia = 1000;
    for (let tentativas = 0; tentativas < 200; tentativas++) {
      const { data, error } = await supabase
        .from("visitas_login")
        .select("id, visitante_id, criado_em, ip")
        .gte("criado_em", desde)
        .order("criado_em", { ascending: true })
        .range(inicio, inicio + tamanhoFatia - 1);
      if (error) throw error;
      const fatia = data || [];
      visitas.push(...fatia);
      if (fatia.length < tamanhoFatia) break;
      inicio += fatia.length;
    }
    return visitas;
  } catch (err) {
    console.error("[admin/painel] erro ao buscar visitas de login:", err?.message || err);
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
    videosConversas,
    lembretes,
    links,
    wifiDicas,
    contatos,
    textos,
    ajudaRapida,
    chamados,
    pedidosReembolso,
    perfis,
    conversasDemo,
    carregamentoEtapas,
    { clientes, mapaUsuarios, resultadosLogin, erroConfig },
    eventosVisita,
    visitasLogin,
  ] = await Promise.all([
    supabase.from("conteudo_fotos").select("*").order("criado_em", { ascending: false }),
    supabase.from("conteudo_video_conversas").select("*").order("criado_em", { ascending: false }),
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
    supabase.from("perfis_usuario").select("user_id, ultimo_acesso, telefone"),
    supabase.from("conversas_demo").select("*").order("criado_em", { ascending: false }),
    supabase.from("conteudo_carregamento_etapas").select("*").order("ordem", { ascending: true }),
    buscarClientesEUsuarios(supabase, idsAdmins),
    buscarEventosVisita(supabase, idsAdmins, desde32Dias),
    buscarVisitasLogin(supabase, desde32Dias),
  ]);

  const reembolsos = (pedidosReembolso.data || []).map((p) => {
    const info = mapaUsuarios.get(p.user_id);
    return {
      ...p,
      nome: info?.nome || "",
      email: info?.email || "Conta removida",
    };
  });

  // Suporte não trazia o nome do cliente porque chamados_suporte só
  // guarda o user_id — junta com o mesmo mapa de usuários usado nos
  // reembolsos.
  const chamadosComNome = (chamados.data || []).map((c) => {
    const info = mapaUsuarios.get(c.user_id);
    return {
      ...c,
      nome: info?.nome || "",
      email: info?.email || "Conta removida",
    };
  });

  const mapaPerfis = new Map((perfis.data || []).map((p) => [p.user_id, p]));
  const clientesComAcesso = clientes.map((c) => {
    const perfil = mapaPerfis.get(c.id);
    return {
      ...c,
      ultimoAcessoIso: perfil?.ultimo_acesso || null,
      telefone: perfil?.telefone || null,
    };
  });

  return (
    <AdminDashboard
      dadosIniciais={{
        fotos: fotos.data || [],
        videosConversas: videosConversas.data || [],
        lembretes: lembretes.data || [],
        links: links.data || [],
        wifiDicas: wifiDicas.data || [],
        contatos: contatos.data || [],
        textos: textos.data || [],
        ajudaRapida: ajudaRapida.data || [],
        chamados: chamadosComNome,
        clientes: clientesComAcesso,
        erroClientes: erroConfig,
        reembolsos,
        eventosVisita,
        visitasLogin,
        resultadosLogin,
        idsAdmins,
        conversasDemo: conversasDemo.data || [],
        carregamentoEtapas: carregamentoEtapas.data || [],
      }}
    />
  );
}
