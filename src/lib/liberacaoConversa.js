// Calcula quantas mensagens do "roteiro" de uma conversa de exemplo já
// estão visíveis pra uma pessoa específica, dado o ritmo de liberação
// gradual escolhido pelo admin (ou tudo de uma vez, se não tiver
// liberação configurada pra essa conversa). Usado tanto pra decidir o
// que mostrar na conversa quanto pra calcular o balãozinho de
// mensagens ainda não vistas na lista.
export function quantidadeVisivelConversa({
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
