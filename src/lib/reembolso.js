const TOTAL_HORAS = 96; // 4 dias

export function formatarDuracao(horas) {
  const dias = Math.floor(horas / 24);
  const horasRestantes = Math.round(horas % 24);
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
