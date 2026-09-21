// Formatação simples de telefone brasileiro: guarda só os dígitos no
// banco e formata pra exibição em (DD) NNNNN-NNNN (celular) ou
// (DD) NNNN-NNNN (fixo).

export function apenasDigitos(valor) {
  return (valor || "").replace(/\D/g, "");
}

export function formatarTelefone(valor) {
  const digitos = apenasDigitos(valor);
  if (digitos.length === 11) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
  if (digitos.length === 10) return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 6)}-${digitos.slice(6)}`;
  return valor || "";
}

// Formata o telefone ENQUANTO a pessoa digita, tipo uma máscara: vai
// colocando os parênteses, o espaço e o traço sozinho, então fica claro
// quantos números faltam e onde. Sem isso, o campo era só um texto
// solto e várias pessoas erravam o número (faltava dígito, sobrava
// dígito, colocava o traço no lugar errado etc.) sem perceber.
export function formatarTelefoneParcial(valor) {
  let digitosBrutos = apenasDigitos(valor);
  // Se colou o número com o "55" do Brasil na frente (ex: copiou do
  // WhatsApp como +55 11 91234-5678), tira esse prefixo — senão ele
  // confunde com o DDD e bagunça o resto do número.
  if (digitosBrutos.length > 11 && digitosBrutos.startsWith("55")) {
    digitosBrutos = digitosBrutos.slice(2);
  }
  const digitos = digitosBrutos.slice(0, 11);
  if (digitos.length === 0) return "";
  if (digitos.length <= 2) return `(${digitos}`;

  const ddd = digitos.slice(0, 2);
  const resto = digitos.slice(2);
  if (resto.length <= 4) return `(${ddd}) ${resto}`;

  // Até 10 dígitos no total ainda pode ser fixo (bloco de 4 no final);
  // ao digitar o 11º dígito vira celular (bloco de 5) e reajusta sozinho.
  if (digitos.length <= 10) {
    return `(${ddd}) ${resto.slice(0, 4)}-${resto.slice(4)}`;
  }
  return `(${ddd}) ${resto.slice(0, 5)}-${resto.slice(5)}`;
}

// Aceita telefone nacional com DDD ou prefixo internacional brasileiro.
// Não interpreta números locais, serviços curtos ou 0800 como DDD.
export function extrairDDD(valor) {
  if (typeof valor !== "string") return null;
  if (valor.trim().startsWith("+") && !/^\+55(?:\D|\d)/.test(valor.trim())) return null;
  let digitos = apenasDigitos(valor);
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) {
    digitos = digitos.slice(2);
  }
  if (!/^[1-9]\d{9,10}$/.test(digitos)) return null;
  return digitos.slice(0, 2);
}

export function filtrarContatosPorDDD(contatos, telefone) {
  const ddd = extrairDDD(telefone);
  if (!ddd) return [];
  return contatos.filter((contato) => extrairDDD(contato.numero) === ddd);
}
