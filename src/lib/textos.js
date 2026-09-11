// Textos/títulos do app que podem ser editados pelo admin (aba "Textos"),
// sem precisar mexer em código. Se a chave não estiver salva no banco,
// usamos o texto padrão daqui.

export const TEXTOS_PADRAO = {
  inicio_titulo: "Início",
  inicio_subtitulo: "Bom te ver por aqui.",
  fotos_titulo: "Fotos",
  fotos_subtitulo: "Fotos motivacionais selecionadas pra você.",
  locais_titulo: "Locais seguros",
  locais_subtitulo: "Sugestões de lugares na região.",
  lembretes_titulo: "Lembretes",
  lembretes_subtitulo: "Lembretes de ligar pra alguém importante.",
  links_titulo: "Links de ajuda",
  links_subtitulo: "Conteúdos úteis selecionados.",
  wifi_titulo: "Wifi",
  wifi_subtitulo: "Dicas de segurança em redes públicas.",
  contatos_titulo: "Contatos úteis",
  contatos_subtitulo: "Serviços que podem ser úteis no dia a dia.",
  suporte_titulo: "Suporte",
  suporte_subtitulo: "Abra um chamado ou continue uma conversa.",
  conversas_titulo: "Conversas",
  conversas_subtitulo: "Importe, se você quiser, organizadas por pessoa.",
  assinatura_titulo: "Assinatura",
  login_selo: "Diário digital",
  login_titulo: "Painel Pessoal",
  login_subtitulo: "Fotos, localização, ligações e pesquisas — tudo num só lugar, só seu.",
  login_erro: "Não deu pra entrar. Tenta de novo.",
  login_rodape: "Sem senha. Só a sua conta Google.",
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
