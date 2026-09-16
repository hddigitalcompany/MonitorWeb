"use client";

import { useState } from "react";
import { entrarComEmail } from "@/lib/authEmail";

export default function EntrarComEmail() {
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [enviado, setEnviado] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    if (!email.trim() || carregando) return;
    setCarregando(true);
    setErro("");

    const resultado = await entrarComEmail(email);
    setCarregando(false);

    if (resultado?.erro) {
      setErro(resultado.erro);
      return;
    }

    setEnviado(true);
  }

  return (
    <div className="mt-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[11px] text-muted">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>

      {enviado ? (
        <div className="rounded-sm border border-olive/40 bg-olive/10 px-3 py-2.5 text-center text-sm text-ink">
          <p>
            Mandamos um link pro seu email (<span className="font-medium">{email}</span>).
          </p>
          <p className="mt-1 text-xs text-muted">Abre o email e toca no link pra entrar.</p>
        </div>
      ) : (
        <form onSubmit={enviar} className="flex flex-col gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Entrar só com seu email"
            disabled={carregando}
            className="field-input disabled:opacity-50"
          />
          {erro && <p className="text-xs text-rust">{erro}</p>}
          <button
            type="submit"
            disabled={carregando || !email.trim()}
            className="w-full rounded-sm border border-border px-3 py-2 text-sm text-ink disabled:opacity-50"
          >
            {carregando ? "Enviando..." : "Entrar com email"}
          </button>
        </form>
      )}
    </div>
  );
}
