// Provedores de email mais comuns no Brasil — usado só pra sugerir uma
// correção quando a pessoa parece ter digitado um desses errado (tipo
// "gmial.com" ou "hotmail.con"). Não verifica se o email existe de
// verdade, só pega erro de digitação nos domínios mais básicos.
const DOMINIOS_COMUNS = [
  "gmail.com",
  "hotmail.com",
  "outlook.com",
  "yahoo.com",
  "yahoo.com.br",
  "icloud.com",
  "live.com",
  "msn.com",
  "bol.com.br",
  "uol.com.br",
  "terra.com.br",
  "ig.com.br",
  "globo.com",
  "globomail.com",
  "aol.com",
  "oi.com.br",
  "zipmail.com.br",
];

// Distância de edição entre duas strings (quantas letras precisa trocar,
// tirar ou adicionar pra uma virar a outra) — quanto menor, mais parecido.
function distanciaEdicao(a, b) {
  const m = a.length;
  const n = b.length;
  const d = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) d[i][0] = i;
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + custo);
    }
  }
  return d[m][n];
}

// Se o domínio do email parece um desses provedores comuns só que com
// erro de digitação, devolve o email corrigido (pra sugerir pra pessoa).
// Devolve null quando o domínio já está certo, ou quando não parece
// nada com nenhum provedor comum (pode ser um domínio de empresa, por
// exemplo — nesse caso é melhor não sugerir nada).
export function sugerirCorrecaoEmail(email) {
  const em = (email || "").trim().toLowerCase();
  const arroba = em.lastIndexOf("@");
  if (arroba <= 0 || arroba === em.length - 1) return null;

  const usuario = em.slice(0, arroba);
  const dominio = em.slice(arroba + 1);
  if (!dominio || DOMINIOS_COMUNS.includes(dominio)) return null;

  let melhor = null;
  let melhorDistancia = Infinity;
  for (const candidato of DOMINIOS_COMUNS) {
    const dist = distanciaEdicao(dominio, candidato);
    if (dist < melhorDistancia) {
      melhorDistancia = dist;
      melhor = candidato;
    }
  }

  // Só sugere quando a diferença é pequena o bastante pra ser um erro de
  // digitação provável — domínio curto tolera menos diferença, senão
  // qualquer coisa vira "sugestão" (ex: "ab.com" não devia virar "aol.com").
  const limite = melhor.length >= 8 ? 2 : 1;
  if (melhorDistancia > 0 && melhorDistancia <= limite) {
    return `${usuario}@${melhor}`;
  }
  return null;
}
