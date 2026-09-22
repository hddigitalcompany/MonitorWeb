"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { entrarComEmail } from "@/lib/authEmail";
import { sugerirCorrecaoEmail } from "@/lib/emailDominios";

export default function EntrarComEmail() {
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const router = useRouter();

  const sugestao = sugerirCorrecaoEmail(email);

  function usarSugestao() {
    setEmail(sugestao);
  }

  async function enviar(e) {
    e.preventDefault();
    if (!email.trim() || carregando) return;
    setCarregando(true);
    setErro("");

    let visitanteId = null;
    try {
      visitanteId = localStorage.getItem("painel_visitante_id");
    } catch {
      // O login continua funcionando se o navegador bloquear o armazenamento.
    }

    const resultado = await entrarComEmail(email, visitanteId);

    if (resultado?.erro) {
      setCarregando(false);
      setErro(resultado.erro);
      return;
    }

    router.push("/carregando");
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-2">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Entrar só com seu email"
        disabled={carregando}
        className="field-input disabled:opacity-50"
      />
      {sugestao && (
        <button
          type="button"
          onClick={usarSugestao}
          className="text-left text-xs text-ink underline decoration-dotted"
        >
          Você quis dizer <span className="font-medium">{sugestao}</span>?
        </button>
      )}
      {erro && <p className="text-xs text-rust">{erro}</p>}
      <button
        type="submit"
        disabled={carregando || !email.trim()}
        className="btn-primary w-full disabled:opacity-50"
      >
        {carregando ? "Entrando..." : "Entrar com email"}
      </button>
    </form>
  );
}
