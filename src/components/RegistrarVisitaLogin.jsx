"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const CHAVE_VISITANTE = "painel_visitante_id";

// Marca, sem exigir login, que alguém chegou na tela de entrar/criar
// conta — é o que alimenta "quantas pessoas chegam aqui mas desistem
// sem criar a conta" no Painel ao vivo (aba Painel ao vivo, admin). Um
// id aleatório guardado no navegador reconhece visitas repetidas da
// mesma pessoa, sem juntar nenhum dado pessoal dela.
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

    const supabase = createClient();
    supabase
      .from("visitas_login")
      .insert({ visitante_id: visitanteId })
      .then(({ error }) => {
        if (error) console.error("[visitas_login] erro ao registrar visita:", error.message);
      });
  }, []);

  return null;
}
