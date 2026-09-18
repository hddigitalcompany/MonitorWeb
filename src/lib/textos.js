// Textos/títulos do app que podem ser editados pelo admin (aba "Textos"),
// sem precisar mexer em código. Se a chave não estiver salva no banco,
// usamos o texto padrão daqui.

export const TEXTOS_PADRAO = {
  inicio_titulo: "Início",
  inicio_subtitulo: "Bom te ver por aqui.",
  fotos_titulo: "Fotos",
  fotos_subtitulo: "Fotos motivacionais selecionadas pra você.",
  fotos_vazio: "Nenhuma foto publicada ainda.",
  locais_titulo: "Locais seguros",
  locais_subtitulo: "Sugestões de lugares na região.",
  locais_vazio: "Nenhuma sugestão publicada ainda.",
  lembretes_titulo: "Lembretes",
  lembretes_subtitulo: "Lembretes de ligar pra alguém importante.",
  lembretes_vazio: "Nenhum lembrete publicado ainda.",
  links_titulo: "Links de ajuda",
  links_subtitulo: "Conteúdos úteis selecionados.",
  links_vazio: "Nenhum link publicado ainda.",
  wifi_titulo: "Wifi",
  wifi_subtitulo: "Dicas de segurança em redes públicas.",
  wifi_vazio: "Nenhuma dica publicada ainda.",
  contatos_titulo: "Contatos úteis",
  contatos_subtitulo: "Serviços que podem ser úteis no dia a dia.",
  contatos_vazio: "Nenhum contato publicado ainda.",
  suporte_titulo: "Suporte",
  suporte_subtitulo: "Abra um chamado ou continue uma conversa.",
  conversas_titulo: "Conversas",
  conversas_subtitulo: "Importe, se você quiser, organizadas por pessoa.",
  conversas_reais_titulo: "Conversas",
  conversas_reais_botao_nova: "Nova conversa",
  conversas_reais_vazio: 'Você ainda não tem nenhuma conversa. Toque em "Nova conversa" pra começar.',
  conversas_demo_titulo: "Conversas de exemplo",
  assinatura_titulo: "Assinatura",
  assinatura_texto: "Em breve.",
  login_selo: "Diário digital",
  login_titulo: "Painel Pessoal",
  login_subtitulo: "Fotos, localização, ligações e pesquisas — tudo num só lugar, só seu.",
  login_erro: "Não deu pra entrar. Tenta de novo.",
  login_rodape: "Sem senha. Só a sua conta Google.",
  completar_titulo: "Só mais um passo",
  completar_subtitulo: "Confirme seus dados pra liberar o acesso ao app.",
  completar_label_nome: "Nome",
  completar_label_telefone: "Número de telefone que você buscou no site",
  completar_dica_telefone: "Vai formatando sozinho enquanto você digita — confere se ficou igual ao seu número, com DDD.",
  completar_erro_nome: "Preenche seu nome pra continuar.",
  completar_erro_telefone: "Falta número no telefone — confere se digitou com DDD e completo.",
  completar_erro_salvar: "Não deu pra salvar. Tenta de novo.",
  completar_botao: "Continuar",
  completar_botao_salvando: "Salvando...",
  carregando_titulo: "Quase lá!",
  carregando_titulo_topo: "Cadastro confirmado",
  carregando_pergunta: "Esse é o seu número de telefone?",
  carregando_subtitulo: "Confira se esse é o número certo pra gente continuar.",
  carregando_botao_sim: "Sim, está certo",
  carregando_botao_nao: "Não, corrigir",
  carregando_botao_editar_salvar: "Salvar e continuar",
};

export async function buscarTextos(supabase) {
  const { data } = await supabase.from("conteudo_textos").select("chave, valor");
  const mapa = {};
  (data || []).forEach((t) => {
    mapa[t.chave] = t.valor;
  });
  return mapa;
}

export function texto(mapa, chave) {
  return mapa?.[chave] ?? TEXTOS_PADRAO[chave] ?? "";
}
