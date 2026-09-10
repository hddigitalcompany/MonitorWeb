// Liberação gradual de conteúdo: cada categoria começa com uma
// quantidade já liberada assim que a pessoa loga pela primeira vez, e
// vai liberando mais itens (sempre os mais antigos primeiro) num ritmo
// próprio — algumas categorias começam rápido e vão desacelerando,
// outras têm um ritmo fixo por dia.
//
// Como é tudo calculado a partir do horário do primeiro login (sem
// depender de nenhum processo rodando em segundo plano), o resultado
// já vem certo assim que a pessoa abre qualquer página do app.

const CATEGORIAS = {
  fotos: { inicial: 2, porPasso: 1, intervalosMin: [5, 10, 20, 40, 90, 180, 360, 720, 1440] },
  lembretes: { inicial: 10, porPasso: 2, intervalosMin: [40] },
  locais: { inicial: 11, porPasso: 1, intervalosMin: [60, 240] },
  links: { inicial: 5, porPasso: 1, intervalosMin: [20, 40, 120] },
  wifi: { inicial: 1, porPasso: 1, intervalosMin: [1440] },
  contatos: { inicial: 200, porPasso: 2, intervalosMin: [1440] },
};

function contarPassos(minutosDecorridos, intervalosMin) {
  if (minutosDecorridos <= 0) return 0;
  let restante = minutosDecorridos;
  let passos = 0;
  let i = 0;
  while (true) {
    const intervalo = intervalosMin[Math.min(i, intervalosMin.length - 1)];
    if (restante < intervalo) break;
    restante -= intervalo;
    passos += 1;
    i += 1;
    if (passos > 200000) break; // segurança contra loop infinito
  }
  return passos;
}

// Quantos itens dessa categoria já estão liberados, dado o momento do
// primeiro login e o momento atual. `total` (opcional) limita o
// resultado à quantidade de itens que realmente existem.
export function quantidadeLiberada(categoria, primeiroLogin, agora = new Date(), total = Infinity) {
  const config = CATEGORIAS[categoria];
  if (!config) return total;

  const minutosDecorridos = (new Date(agora).getTime() - new Date(primeiroLogin).getTime()) / 60000;
  const passos = contarPassos(minutosDecorridos, config.intervalosMin);
  const liberado = config.inicial + passos * config.porPasso;

  return Math.max(0, Math.min(liberado, total));
}
