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
//
// Algumas categorias também têm uma "faixa" pro intervalo entre uma
// liberação e outra depois que a escalada inicial termina: em vez de
// um número fixo, cada passo sorteia um tempo dentro de um mínimo e
// máximo (pra não parecer um relógio cravado). Esse sorteio usa uma
// semente fixa por usuário + passo, então o resultado não muda toda
// vez que a página é recarregada — só parece variado ao longo do
// tempo.

const OFFSET_BR_MS = 3 * 60 * 60 * 1000; // Brasil = UTC-3 (sem horário de verão desde 2019)
const MIN_DIA = 24 * 60;

const CATEGORIAS = {
  fotos: {
    inicial: 47,
    porPasso: 1,
    intervalosMin: [5, 10, 20, 40, 90, 180],
    faixaAposMin: { min: 60, max: 360 }, // depois da escalada inicial: entre 1h e 6h, variando
    janelaAtiva: { inicioHora: 6, fimHora: 19 }, // não libera das 19h às 6h
  },
  lembretes: { inicial: 12, porPasso: 2, intervalosMin: [40] },
  locais: {
    inicial: 11,
    porPasso: 1,
    intervalosMin: [60, 240],
    janelaAtiva: { inicioHora: 6, fimHora: 19 }, // não libera das 19h às 6h
  },
  links: {
    inicial: 12,
    porPasso: 1,
    intervalosMin: [20, 40],
    faixaAposMin: { min: 60, max: 120 }, // depois da escalada inicial: entre 1h e 2h, variando
    janelaAtiva: { inicioHora: 6, fimHora: 23.5 }, // não libera da 23h30 às 6h
  },
  wifi: { inicial: 13, porPasso: 1, intervalosMin: [1440] },
  contatos: { inicial: 200, porPasso: 2, intervalosMin: [1440] },
};

// Hash simples e determinístico (FNV-1a) só pra gerar uma semente a
// partir de uma string.
function hashSemente(texto) {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Gerador pseudo-aleatório determinístico (mulberry32): mesma semente
// sempre devolve o mesmo número entre 0 e 1.
function aleatorioDaSemente(semente) {
  let t = (semente + 0x6d2b79f5) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

// Intervalo (em minutos) até o próximo item liberado, no passo `indice`
// (0 = primeiro passo depois da quantidade inicial). Usa a lista fixa
// enquanto ela dura; depois, se a categoria tiver `faixaAposMin`,
// sorteia (de forma estável) um valor dentro da faixa.
function intervaloDoPasso(categoria, primeiroLogin, indice, config) {
  const { intervalosMin, faixaAposMin } = config;
  if (indice < intervalosMin.length) return intervalosMin[indice];
  if (!faixaAposMin) return intervalosMin[intervalosMin.length - 1];

  const semente = hashSemente(`${categoria}|${new Date(primeiroLogin).getTime()}|${indice}`);
  const r = aleatorioDaSemente(semente);
  return faixaAposMin.min + r * (faixaAposMin.max - faixaAposMin.min);
}

function contarPassos(minutosDecorridos, obterIntervalo) {
  if (minutosDecorridos <= 0) return 0;
  let restante = minutosDecorridos;
  let passos = 0;
  while (true) {
    const intervalo = obterIntervalo(passos);
    if (restante < intervalo) break;
    restante -= intervalo;
    passos += 1;
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

// Acha o instante real (Date) em que se alcançam `minutosNecessarios`
// de tempo "ativo" (dentro da janela) contados a partir do primeiro
// login — é o inverso de minutosAtivosNoIntervalo, usado pra saber
// exatamente que horas um item específico foi liberado.
function dataAposMinutosAtivos(primeiroLogin, minutosNecessarios, inicioHora, fimHora) {
  const inicioMinLocal = minutosLocalBR(primeiroLogin);
  if (minutosNecessarios <= 0) return new Date(primeiroLogin);

  let acumulado = 0;
  let cursor = Math.floor(inicioMinLocal / MIN_DIA) * MIN_DIA;

  for (let i = 0; i < 100000; i++) {
    const janelaInicio = cursor + inicioHora * 60;
    const janelaFim = cursor + fimHora * 60;
    const overlapInicio = Math.max(inicioMinLocal, janelaInicio);
    const overlapFim = janelaFim;
    if (overlapFim > overlapInicio) {
      const disponivelHoje = overlapFim - overlapInicio;
      if (acumulado + disponivelHoje >= minutosNecessarios) {
        const minutoLocalAlvo = overlapInicio + (minutosNecessarios - acumulado);
        return new Date(minutoLocalAlvo * 60000 + OFFSET_BR_MS);
      }
      acumulado += disponivelHoje;
    }
    cursor += MIN_DIA;
  }
  return new Date(primeiroLogin);
}

// A que horas (Date) o item na posição `indice` (0 = o mais antigo)
// foi liberado pra esse usuário. Os primeiros `inicial` itens contam
// como liberados assim que ela loga a primeira vez; os seguintes
// seguem o mesmo ritmo (e a mesma janela de horário, se a categoria
// tiver uma) usado em quantidadeLiberada.
export function dataDeLiberacao(categoria, primeiroLogin, indice) {
  const config = CATEGORIAS[categoria];
  if (!config) return new Date(primeiroLogin);
  if (indice < config.inicial) return new Date(primeiroLogin);

  const passoNecessario = Math.ceil((indice - config.inicial + 1) / config.porPasso);
  let minutosNecessarios = 0;
  for (let k = 0; k < passoNecessario; k++) {
    minutosNecessarios += intervaloDoPasso(categoria, primeiroLogin, k, config);
  }

  if (config.janelaAtiva) {
    return dataAposMinutosAtivos(
      primeiroLogin,
      minutosNecessarios,
      config.janelaAtiva.inicioHora,
      config.janelaAtiva.fimHora
    );
  }
  return new Date(new Date(primeiroLogin).getTime() + minutosNecessarios * 60000);
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

  const passos = contarPassos(minutosDecorridos, (indice) =>
    intervaloDoPasso(categoria, primeiroLogin, indice, config)
  );
  const liberado = config.inicial + passos * config.porPasso;

  return Math.max(0, Math.min(liberado, total));
}
