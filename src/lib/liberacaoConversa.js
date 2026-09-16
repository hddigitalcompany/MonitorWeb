// Agrupa mensagens consecutivas do mesmo remetente em "rajadas" — várias
// mensagens seguidas da mesma pessoa contam como um bloco só na hora de
// liberar aos poucos (não libera uma por uma dentro da mesma rajada).
export function agruparEmRajadas(mensagens) {
  const rajadas = [];
  for (const m of mensagens) {
    const ultima = rajadas[rajadas.length - 1];
    if (ultima && ultima.remetente === m.remetente) {
      ultima.mensagens.push(m);
    } else {
      rajadas.push({ remetente: m.remetente, mensagens: [m] });
    }
  }
  return rajadas;
}

// Liberação gradual pra conversa em GRUPO: um intervalo só, mensagem por
// mensagem (não agrupa em rajadas, porque não tem só duas pessoas pra
// separar entre "enviada" e "recebida").
export function quantidadeVisivelGrupo({
  liberacaoIntervaloMinutos,
  liberacaoQuantidadeInicial,
  primeiraAbertura,
  totalRoteiro,
  agora = new Date(),
}) {
  if (!liberacaoIntervaloMinutos || liberacaoIntervaloMinutos <= 0) return totalRoteiro;

  const inicial = liberacaoQuantidadeInicial != null ? liberacaoQuantidadeInicial : 1;
  if (!primeiraAbertura) return Math.min(totalRoteiro, inicial);

  const minutosPassados = (agora.getTime() - new Date(primeiraAbertura).getTime()) / 60000;
  return Math.min(totalRoteiro, inicial + Math.floor(minutosPassados / liberacaoIntervaloMinutos));
}

// Liberação gradual pra conversa NORMAL (2 pessoas): as mensagens
// enviadas em sequência pela mesma pessoa (rajada) liberam juntas, e o
// tempo até a próxima rajada aparecer varia conforme ela foi enviada
// por "você" ou recebida da outra pessoa.
export function quantidadeVisivelNormal({
  doRoteiro,
  participanteVoce,
  intervaloEnviadasMinutos,
  intervaloRecebidasMinutos,
  quantidadeInicialRajadas,
  primeiraAbertura,
  agora = new Date(),
}) {
  const rajadas = agruparEmRajadas(doRoteiro);
  const inicial = Math.min(rajadas.length, quantidadeInicialRajadas != null ? quantidadeInicialRajadas : 1);

  function contarMensagens(qtdRajadas) {
    return rajadas.slice(0, qtdRajadas).reduce((soma, r) => soma + r.mensagens.length, 0);
  }

  if (!primeiraAbertura) return contarMensagens(inicial);

  const minutosPassados = (agora.getTime() - new Date(primeiraAbertura).getTime()) / 60000;

  let tempoAcumulado = 0;
  let quantidadeRajadas = inicial;

  for (let i = inicial; i < rajadas.length; i++) {
    const ehEnviada = rajadas[i].remetente === participanteVoce;
    const intervalo = (ehEnviada ? intervaloEnviadasMinutos : intervaloRecebidasMinutos) || 0;
    tempoAcumulado += intervalo;
    if (tempoAcumulado > minutosPassados) break;
    quantidadeRajadas = i + 1;
  }

  return contarMensagens(quantidadeRajadas);
}

// Decide qual das duas liberações usar (grupo ou normal), de acordo com
// o tipo da conversa e o que o admin configurou pra ela. Se não tiver
// nenhuma liberação configurada, mostra tudo de uma vez (como sempre
// foi).
export function quantidadeVisivelConversa({ conversa, doRoteiro, primeiraAbertura, agora = new Date() }) {
  const totalRoteiro = doRoteiro.length;

  if (conversa.tipo === "grupo") {
    return quantidadeVisivelGrupo({
      liberacaoIntervaloMinutos: conversa.liberacao_intervalo_minutos,
      liberacaoQuantidadeInicial: conversa.liberacao_quantidade_inicial,
      primeiraAbertura,
      totalRoteiro,
      agora,
    });
  }

  const temLiberacaoNormal = conversa.liberacao_intervalo_enviadas_minutos || conversa.liberacao_intervalo_recebidas_minutos;
  if (!temLiberacaoNormal) return totalRoteiro;

  return quantidadeVisivelNormal({
    doRoteiro,
    participanteVoce: conversa.participante_voce,
    intervaloEnviadasMinutos: conversa.liberacao_intervalo_enviadas_minutos,
    intervaloRecebidasMinutos: conversa.liberacao_intervalo_recebidas_minutos,
    quantidadeInicialRajadas: conversa.liberacao_quantidade_inicial,
    primeiraAbertura,
    agora,
  });
}

// Decide se a conversa inteira já pode aparecer pro cliente, de acordo
// com quantas horas se passaram desde que a conta dele foi criada
// (primeiro_login). horas_liberacao = 0 (ou vazio) significa "aparece
// desde o início".
export function conversaLiberada(horasLiberacao, primeiroLoginIso, agora = new Date()) {
  if (!horasLiberacao || horasLiberacao <= 0) return true;
  if (!primeiroLoginIso) return false;

  const horasPassadas = (agora.getTime() - new Date(primeiroLoginIso).getTime()) / 3600000;
  return horasPassadas >= horasLiberacao;
}
