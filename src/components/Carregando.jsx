"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { apenasDigitos, formatarTelefone, formatarTelefoneParcial } from "@/lib/telefone";
import { texto } from "@/lib/textos";
import { Check, Loader2 } from "lucide-react";

// Roda toda vez que a pessoa entra (depois do login, ou depois de
// completar o cadastro): mostra as etapas configuradas no admin uma
// por uma, com o telefone dela fixo no topo. Só na primeira vez que
// termina, pergunta se o telefone tá certo; se ela corrigir, roda a
// sequência de novo do início. Da segunda vez em diante (telefone já
// confirmado) só passa pela animação e segue direto pro painel.
export default function Carregando({
  telefoneInicial,
  telefoneConfirmadoInicial,
  etapas,
  textos,
  preview,
}) {
  const t = (chave) => texto(textos, chave);
  const router = useRouter();
  const supabase = createClient();

  const [passo, setPasso] = useState(0);
  const [fase, setFase] = useState("animando"); // animando | confirmando | editando
  const [telefoneAtual, setTelefoneAtual] = useState(telefoneInicial);
  const [telefoneConfirmado, setTelefoneConfirmado] = useState(telefoneConfirmadoInicial);
  const [telefoneEdicao, setTelefoneEdicao] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (fase !== "animando") return;

    if (passo >= etapas.length) {
      if (telefoneConfirmado && !preview) {
        router.push("/dashboard/inicio");
      } else {
        setFase("confirmando");
      }
      return;
    }

    const segundos = Number(etapas[passo]?.duracao_segundos);
    const duracaoMs = Math.max(300, (Number.isFinite(segundos) ? segundos : 1.5) * 1000);
    const id = setTimeout(() => setPasso((p) => p + 1), duracaoMs);
    return () => clearTimeout(id);
  }, [passo, fase, etapas, telefoneConfirmado, preview, router]);

  async function confirmarCorreto() {
    setSalvando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("perfis_usuario").update({ telefone_confirmado: true }).eq("user_id", user.id);
    }
    setSalvando(false);
    setTelefoneConfirmado(true);
    if (!preview) {
      router.push("/dashboard/inicio");
      router.refresh();
    }
  }

  function comecarEdicao() {
    setTelefoneEdicao(formatarTelefoneParcial(telefoneAtual));
    setFase("editando");
  }

  function cancelarEdicao() {
    setFase("confirmando");
  }

  async function salvarEdicao() {
    const digitos = apenasDigitos(telefoneEdicao);
    if (digitos.length < 10) return;

    setSalvando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("perfis_usuario").update({ telefone: digitos }).eq("user_id", user.id);
    }
    setSalvando(false);

    setTelefoneAtual(digitos);
    setPasso(0);
    setFase("animando");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <p className="mb-8 text-center text-sm text-muted">{formatarTelefone(telefoneAtual)}</p>

      {fase === "animando" && (
        <div className="flex flex-col items-center gap-7">
          <div className="relative w-full rounded-md border border-border bg-surface px-4 py-3.5 text-center shadow-sm">
            <p className="text-sm font-medium text-ink">
              {etapas[Math.min(passo, etapas.length - 1)]?.frase}
            </p>
            <span className="absolute left-1/2 top-full -mt-1.5 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-border bg-surface" />
          </div>

          <div className="flex w-full items-center">
            {etapas.map((etapa, i) => {
              const feito = i < passo;
              const ativo = i === passo;
              return (
                <div key={etapa.id ?? i} className="flex flex-1 items-center last:flex-none">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                      feito ? "bg-olive text-white" : ativo ? "bg-amber text-ink" : "bg-surface2 text-muted"
                    }`}
                  >
                    {feito ? (
                      <Check size={14} />
                    ) : ativo ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      i + 1
                    )}
                  </div>
                  {i < etapas.length - 1 && (
                    <div className={`h-0.5 flex-1 ${feito ? "bg-olive" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {fase === "confirmando" && (
        <div className="flex flex-col items-center gap-4 text-center">
          <p className="font-bold text-lg text-ink">{t("carregando_pergunta")}</p>
          <p className="font-extrabold tracking-tight text-2xl text-ink">{formatarTelefone(telefoneAtual)}</p>
          <div className="mt-2 flex w-full gap-2">
            <button
              onClick={comecarEdicao}
              disabled={salvando}
              className="btn-secondary flex-1 rounded-full disabled:opacity-50"
            >
              {t("carregando_botao_nao")}
            </button>
            <button
              onClick={confirmarCorreto}
              disabled={salvando}
              className="btn-primary flex-1 rounded-full disabled:opacity-50"
            >
              {t("carregando_botao_sim")}
            </button>
          </div>
        </div>
      )}

      {fase === "editando" && (
        <div className="flex flex-col gap-3">
          <p className="mb-0.5 font-bold text-base text-ink">{t("completar_label_telefone")}</p>
          <p className="mb-1 text-xs text-muted">{t("completar_dica_telefone")}</p>
          <input
            autoFocus
            value={telefoneEdicao}
            onChange={(e) => setTelefoneEdicao(formatarTelefoneParcial(e.target.value))}
            placeholder="(11) 91234-5678"
            inputMode="tel"
            maxLength={16}
            className="field-input"
          />
          <div className="mt-2 flex gap-2">
            <button onClick={cancelarEdicao} disabled={salvando} className="btn-secondary flex-1 disabled:opacity-50">
              Cancelar
            </button>
            <button
              onClick={salvarEdicao}
              disabled={salvando || apenasDigitos(telefoneEdicao).length < 10}
              className="btn-primary flex-1 disabled:opacity-50"
            >
              {salvando ? t("completar_botao_salvando") : t("carregando_botao_editar_salvar")}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
