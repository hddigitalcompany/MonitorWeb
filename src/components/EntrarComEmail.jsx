"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { entrarComEmail } from "@/lib/authEmail";

export default function EntrarComEmail() {
  const [email, setEmail] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const router = useRouter();

  async function enviar(e) {
    e.preventDefault();
    if (!email.trim() || carregando) return;
    setCarregando(true);
    setErro("");

    const resultado = await entrarComEmail(email);

    if (resultado?.erro) {
      setCarregando(false);
      setErro(resultado.erro);
      return;
    }

    router.push("/dashboard/inicio");
    router.refresh();
  }

  return (
    <form onSubmit={enviar} className="mt-4 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-[11px] text-muted">
        <span className="h-px flex-1 bg-border" />
        ou
        <span className="h-px flex-1 bg-border" />
      </div>
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
        {carregando ? "Entrando..." : "Entrar com email"}
      </button>
    </form>
  );
}
