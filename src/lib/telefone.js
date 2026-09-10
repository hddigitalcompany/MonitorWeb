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
