// Liberação gradual de conteúdo: cada categoria começa com uma
// quantidade já liberada assim que a pessoa loga pela primeira vez, e
// vai liberando mais itens (sempre os mais antigos primeiro) num ritmo
// próprio — algumas categorias começam rápido e vão desacelerando,
// outras têm um ritmo fixo por dia.
//
// Como é tudo calculado a partir do horário do primeiro login (sem
// depender de nenhum processo rodando em segundo plano), o resultado
// já vem certo assim que a pessoa abre qualquer página do app.
//
// Algumas categorias têm uma "janela ativa": elas só liberam itens
// novos dentro de um horário do dia (hora local do Brasil) — fora
// dessa janela o relógio delas fica pausado, e volta a contar quando a
// janela abre de novo.

const OFFSET_BR_MS = 3 * 60 * 60 * 1000; // Brasil = UTC-3 (sem horário de verão desde 2019)
const MIN_DIA = 24 * 60;

const CATEGORIAS = {
  fotos: {
    inicial: 2,
    porPasso: 1,
    intervalosMin: [5, 10, 20, 40, 90, 180, 360, 720, 1440],
    janelaAtiva: { inicioHora: 6, fimHora: 19 }, // não libera das 19h às 6h
  },
  lembretes: { inicial: 10, porPasso: 2, intervalosMin: [40] },
  locais: {
    inicial: 11,
    porPasso: 1,
    intervalosMin: [60, 240],
    janelaAtiva: { inicioHora: 6, fimHora: 19 }, // não libera das 19h às 6h
  },
  links: {
    inicial: 5,
    porPasso: 1,
    intervalosMin: [20, 40, 120],
    janelaAtiva: { inicioHora: 6, fimHora: 19 }, // não libera das 19h às 6h
  },
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

// Converte um instante real (UTC) para "minutos de relógio no Brasil" —
// só um deslocamento fixo de fuso, usado pra recortar as janelas de
// horário abaixo.
function minutosLocalBR(data) {
  return (new Date(data).getTime() - OFFSET_BR_MS) / 60000;
}

// Quantos minutos, dentro do intervalo [inicio, fim], caem dentro da
// janela [inicioHora, fimHora) de cada dia (hora local do Brasil).
// Usado pelas categorias que não devem liberar nada de madrugada/noite.
function minutosAtivosNoIntervalo(inicio, fim, inicioHora, fimHora) {
  const inicioMinLocal = minutosLocalBR(inicio);
  const fimMinLocal = minutosLocalBR(fim);
  if (fimMinLocal <= inicioMinLocal) return 0;

  let total = 0;
  let cursor = Math.floor(inicioMinLocal / MIN_DIA) * MIN_DIA;

  while (cursor < fimMinLocal) {
    const janelaInicio = cursor + inicioHora * 60;
    const janelaFim = cursor + fimHora * 60;
    const overlapInicio = Math.max(inicioMinLocal, janelaInicio);
    const overlapFim = Math.min(fimMinLocal, janelaFim);
    if (overlapFim > overlapInicio) total += overlapFim - overlapInicio;
    cursor += MIN_DIA;
  }
  return total;
}

// Quantos itens dessa categoria já estão liberados, dado o momento do
// primeiro login e o momento atual. `total` (opcional) limita o
// resultado à quantidade de itens que realmente existem.
export function quantidadeLiberada(categoria, primeiroLogin, agora = new Date(), total = Infinity) {
  const config = CATEGORIAS[categoria];
  if (!config) return total;

  const minutosDecorridos = config.janelaAtiva
    ? minutosAtivosNoIntervalo(
        primeiroLogin,
        agora,
        config.janelaAtiva.inicioHora,
        config.janelaAtiva.fimHora
      )
    : (new Date(agora).getTime() - new Date(primeiroLogin).getTime()) / 60000;

  const passos = contarPassos(minutosDecorridos, config.intervalosMin);
  const liberado = config.inicial + passos * config.porPasso;

  return Math.max(0, Math.min(liberado, total));
}
