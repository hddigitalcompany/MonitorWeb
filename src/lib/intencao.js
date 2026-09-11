// Reconhece se uma resposta em texto livre do chat de cancelamento quer
// dizer "sim, continuar" ou "não, desistir/cancelar" — não é nenhuma IA de
// verdade, só um reconhecimento de palavras-chave comuns em português. Se
// não reconhecer nada, devolve "indefinido" e a conversa pede pra pessoa
// esclarecer (ou usar os botões, que continuam sempre disponíveis).

function normalizar(texto) {
  return (texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .replace(/[^a-z0-9\s]/g, " ") // tira pontuação
    .replace(/\s+/g, " ")
    .trim();
}

const PALAVRAS_NEGATIVAS = [
  "desistir",
  "desisto",
  "desista",
  "cancelar",
  "cancela",
  "mudei de ideia",
  "muda de ideia",
  "deixa pra la",
  "deixa quieto",
  "esquece",
  "esqueci",
  "voltar atras",
  "volta atras",
  "nao quero",
  "nao vou",
  "nao",
];

const PALAVRAS_POSITIVAS = [
  "continuar",
  "continua",
  "seguir",
  "segue",
  "sim",
  "pode",
  "confirmo",
  "confirmar",
  "confirmado",
  "concordo",
  "de acordo",
  "beleza",
  "ok",
  "certo",
  "vamos",
  "isso mesmo",
  "exato",
  "afirmativo",
  "claro",
];

function contemFrase(textoNormalizado, lista) {
  const alvo = ` ${textoNormalizado} `;
  return lista.some((frase) => alvo.includes(` ${normalizar(frase)} `));
}

export function classificarResposta(texto) {
  const t = normalizar(texto);
  if (!t) return "indefinido";
  if (contemFrase(t, PALAVRAS_NEGATIVAS)) return "negativo";
  if (contemFrase(t, PALAVRAS_POSITIVAS)) return "positivo";
  return "indefinido";
}
