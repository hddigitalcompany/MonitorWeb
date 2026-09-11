const TOTAL_HORAS = 96; // 4 dias

export function formatarDuracao(horas) {
  let dias = Math.floor(horas / 24);
  let horasRestantes = Math.round(horas % 24);
  // O arredondamento acima podia "estourar" pra 24h (ex: 23h36 virava 24h em
  // vez de virar 1 dia), mostrando algo tipo "3 dias e 24h" — corrige aqui.
  if (horasRestantes === 24) {
    dias += 1;
    horasRestantes = 0;
  }
  if (dias > 0 && horasRestantes > 0) return `${dias} dia${dias > 1 ? "s" : ""} e ${horasRestantes}h`;
  if (dias > 0) return `${dias} dia${dias > 1 ? "s" : ""}`;
  if (horasRestantes > 0) return `${horasRestantes}h`;
  return "menos de 1h";
}

export function calcularEtapaReembolso(criadoEm, agora = new Date()) {
  const inicio = new Date(criadoEm).getTime();
  const horasDecorridas = (agora.getTime() - inicio) / (1000 * 60 * 60);
  const concluido = horasDecorridas >= TOTAL_HORAS;
  const horasRestantes = Math.max(0, TOTAL_HORAS - horasDecorridas);
  return {
    concluido,
    horasDecorridas,
    horasRestantes,
    textoRestante: formatarDuracao(horasRestantes),
  };
}

export function marcosDecorridos(horasDecorridas) {
  const marcos = [12, 24, 36, 48, 60, 72, 84, 96];
  return marcos.filter((m) => horasDecorridas >= m);
}

// Linha do tempo do reembolso, um marco por dia — usada na tela de status
// pra mostrar o histórico de etapas (com data/hora de cada uma), em vez de
// só o tempo que falta.
export function checkpointsReembolso(criadoEm) {
  const inicio = new Date(criadoEm).getTime();
  const marcosHoras = [24, 48, 72, 96];
  return marcosHoras.map((h) => {
    const restante = Math.max(0, TOTAL_HORAS - h);
    return {
      horas: h,
      data: new Date(inicio + h * 60 * 60 * 1000),
      texto: h >= TOTAL_HORAS ? "Reembolso efetuado com sucesso" : `Tempo restante pro reembolso: ${formatarDuracao(restante)}`,
    };
  });
}
