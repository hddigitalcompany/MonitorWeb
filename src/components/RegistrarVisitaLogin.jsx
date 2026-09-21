"use client";

import { useEffect } from "react";

const CHAVE_VISITANTE = "painel_visitante_id";

// Marca, sem exigir login, que alguém chegou na tela de entrar/criar
// conta — é o que alimenta "quantas pessoas chegam aqui mas desistem
// sem criar a conta" no Painel ao vivo (aba Painel ao vivo, admin). Um
// id aleatório guardado no navegador reconhece visitas repetidas da
// mesma pessoa, sem juntar nenhum dado pessoal dela. O envio passa pelo
// servidor (em vez de gravar direto no banco) pra capturar o IP de quem
// visitou — é isso que depois permite saber se esse visitante já tem
// conta (mesmo IP de uma conta existente) ou se realmente nunca se
// cadastrou.
export default function RegistrarVisitaLogin() {
  useEffect(() => {
    let visitanteId;
    try {
      visitanteId = localStorage.getItem(CHAVE_VISITANTE);
      if (!visitanteId) {
        visitanteId = crypto.randomUUID();
        localStorage.setItem(CHAVE_VISITANTE, visitanteId);
      }
    } catch {
      visitanteId = crypto.randomUUID();
    }

    fetch("/api/visitas-login/registrar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitanteId }),
    }).catch(() => {});
  }, []);

  return null;
}
