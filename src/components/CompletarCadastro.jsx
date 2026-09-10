"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { apenasDigitos } from "@/lib/telefone";

export default function CompletarCadastro({ nomeInicial }) {
  const [nome, setNome] = useState(nomeInicial || "");
  const [telefone, setTelefone] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function enviar() {
    setErro("");
    if (!nome.trim()) {
      setErro("Preenche seu nome pra continuar.");
      return;
    }
    const digitos = apenasDigitos(telefone);
    if (digitos.length < 10) {
      setErro("Preenche o telefone com DDD (mínimo 10 números) pra continuar.");
      return;
    }

    setEnviando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.auth.updateUser({ data: { full_name: nome.trim() } });
    const { error } = await supabase
      .from("perfis_usuario")
      .update({ telefone: digitos })
      .eq("user_id", user.id);

    setEnviando(false);

    if (error) {
      setErro("Não deu pra salvar. Tenta de novo.");
      return;
    }

    router.push("/dashboard/inicio");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <p className="mb-1 font-extrabold tracking-tight text-2xl text-ink">Só mais um passo</p>
      <p className="mb-6 text-sm text-muted">Confirme seus dados pra liberar o acesso ao app.</p>

      <div className="mb-4">
        <p className="field-label">Nome</p>
        <input value={nome} onChange={(e) => setNome(e.target.value)} className="field-input" />
      </div>

      <div className="mb-2">
        <p className="field-label">Número de telefone que você buscou no site</p>
        <input
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          placeholder="(11) 91234-5678"
          inputMode="tel"
          className="field-input"
        />
        <p className="mt-1 text-xs text-muted">Preenche com o DDD pra poder continuar.</p>
      </div>

      {erro && <p className="mb-2 text-xs text-rust">{erro}</p>}

      <button onClick={enviar} disabled={enviando} className="btn-primary mt-2 w-full disabled:opacity-50">
        {enviando ? "Salvando..." : "Continuar"}
      </button>
    </main>
  );
}
