// Lê o .txt exportado de uma conversa do WhatsApp e separa cada mensagem
// (quem escreveu, o que escreveu, quando) — pra dar pra montar uma
// "conversa de exemplo" e mostrar como um chat de verdade, com balõezinhos.
//
// Suporta os dois formatos mais comuns de exportação:
//   Android: 14/03/2024, 10:05 - Fulano: texto da mensagem
//   iPhone:  [14/03/2024, 10:05:32] Fulano: texto da mensagem
//
// Linhas que não começam com data (mensagem que continua na linha de
// baixo, porque a pessoa apertou "enter") são grudadas na mensagem
// anterior. Avisos do próprio WhatsApp (tipo "as mensagens são
// protegidas com criptografia de ponta a ponta") não têm "Nome:" antes
// do texto, então são ignorados.

const PADRAO_ANDROID = /^(\d{1,2}\/\d{1,2}\/\d{2,4}),?\s+(\d{1,2}:\d{2})(?::\d{2})?\s*[-–]\s*(.*)$/;
const PADRAO_IOS = /^\[(\d{1,2}\/\d{1,2}\/\d{2,4}),\s+(\d{1,2}:\d{2})(?::\d{2})?\]\s*(.*)$/;

function paraIso(dataBr, horaBr) {
  const partes = dataBr.split("/").map((p) => p.padStart(2, "0"));
  if (partes.length !== 3) return null;
  let [dia, mes, ano] = partes;
  if (ano.length === 2) ano = `20${ano}`;
  const iso = `${ano}-${mes}-${dia}T${horaBr}:00`;
  const data = new Date(iso);
  return Number.isNaN(data.getTime()) ? null : data.toISOString();
}

export function parseWhatsAppTxt(textoArquivo) {
  const linhas = (textoArquivo || "").replace(/\r\n/g, "\n").replace(/‎/g, "").split("\n");
  const mensagens = [];

  for (const linhaBruta of linhas) {
    const linha = linhaBruta.trim();
    if (!linha) continue;

    const match = PADRAO_ANDROID.exec(linha) || PADRAO_IOS.exec(linha);
    if (match) {
      const [, dataBr, horaBr, resto] = match;
      const separador = resto.indexOf(":");
      // Sem "Nome:" no começo = aviso do sistema do WhatsApp, não é
      // mensagem de ninguém — ignora.
      if (separador === -1) continue;

      const remetente = resto.slice(0, separador).trim();
      const texto = resto.slice(separador + 1).trim();
      if (!remetente || remetente.length > 60) continue; // provavelmente não é "Nome:", é hora dentro do texto

      mensagens.push({ remetente, texto, dataHoraIso: paraIso(dataBr, horaBr) });
    } else if (mensagens.length > 0) {
      // Continuação da mensagem anterior (quebra de linha dentro da
      // mesma mensagem original).
      mensagens[mensagens.length - 1].texto += `\n${linha}`;
    }
  }

  return mensagens;
}

export function remetentesUnicos(mensagens) {
  const vistos = [];
  mensagens.forEach((m) => {
    if (!vistos.includes(m.remetente)) vistos.push(m.remetente);
  });
  return vistos;
}
