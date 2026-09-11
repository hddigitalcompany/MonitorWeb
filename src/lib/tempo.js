// Todas as horas do app são mostradas no fuso do Brasil (America/Sao_Paulo),
// não importa se o código roda no navegador da pessoa ou no servidor —
// sem isso, páginas renderizadas no servidor (que roda em UTC) mostravam
// a hora errada, adiantada em 3 horas.
const FUSO_BR = "America/Sao_Paulo";

export function formatarHora(data) {
  return new Date(data).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: FUSO_BR,
  });
}

// "dd/mm hh:mm", já no fuso do Brasil — usado na linha do tempo do reembolso.
export function formatarDataHora(data) {
  const d = new Date(data);
  const dataTxt = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: FUSO_BR });
  const horaTxt = formatarHora(d);
  return `${dataTxt} ${horaTxt}`;
}

export function tempoRelativo(data) {
  const diffMs = Date.now() - new Date(data).getTime();
  const diffMin = Math.max(0, Math.round(diffMs / 60000));
  if (diffMin < 1) return "agora mesmo";
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.round(diffH / 24);
  return `há ${diffD} dia${diffD > 1 ? "s" : ""}`;
}

export function dataPorExtenso(data) {
  const texto = new Date(data).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: FUSO_BR,
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}
