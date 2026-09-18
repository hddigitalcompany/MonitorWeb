"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { apenasDigitos, formatarTelefoneParcial } from "@/lib/telefone";
import { texto } from "@/lib/textos";

export default function CompletarCadastro({ nomeInicial, textos }) {
  const t = (chave) => texto(textos, chave);
  const [nome, setNome] = useState(nomeInicial || "");
  const [telefone, setTelefone] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const router = useRouter();
  const supabase = createClient();

  async function enviar() {
    setErro("");
    if (!nome.trim()) {
      setErro(t("completar_erro_nome"));
      return;
    }
    const digitos = apenasDigitos(telefone);
    if (digitos.length < 10) {
      setErro(t("completar_erro_telefone"));
      return;
    }

    setEnviando(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    await supabase.auth.updateUser({ data: { full_name: nome.trim() } });
    await supabase
      .from("diretorio_usuarios")
      .upsert({ user_id: user.id, nome: nome.trim(), atualizado_em: new Date().toISOString() });
    const { error } = await supabase
      .from("perfis_usuario")
      .update({ telefone: digitos })
      .eq("user_id", user.id);

    setEnviando(false);

    if (error) {
      setErro(t("completar_erro_salvar"));
      return;
    }

    router.push("/carregando");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <p className="mb-1 font-extrabold tracking-tight text-2xl text-ink">{t("completar_titulo")}</p>
      <p className="mb-6 text-sm text-muted">{t("completar_subtitulo")}</p>

      <div className="mb-4">
        <p className="field-label">{t("completar_label_nome")}</p>
        <input value={nome} onChange={(e) => setNome(e.target.value)} className="field-input" />
      </div>

      <div className="mb-2 mt-6">
        <p className="mb-0.5 font-bold text-base text-ink">{t("completar_label_telefone")}</p>
        <p className="mb-2 text-xs text-muted">{t("completar_dica_telefone")}</p>
        <input
          value={telefone}
          onChange={(e) => setTelefone(formatarTelefoneParcial(e.target.value))}
          placeholder="(11) 91234-5678"
          inputMode="tel"
          maxLength={16}
          className="field-input"
        />
      </div>

      {erro && <p className="mb-2 text-xs text-rust">{erro}</p>}

      <button onClick={enviar} disabled={enviando} className="btn-primary mt-2 w-full disabled:opacity-50">
        {enviando ? t("completar_botao_salvando") : t("completar_botao")}
      </button>
    </main>
  );
}
