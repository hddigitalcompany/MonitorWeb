"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { apenasDigitos, formatarTelefone, formatarTelefoneParcial } from "@/lib/telefone";
import { texto } from "@/lib/textos";
import { Badge, Check, Loader2 } from "lucide-react";

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
  const [etapaConcluida, setEtapaConcluida] = useState(false);

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

    setEtapaConcluida(false);
    const etapaAtual = etapas[passo];
    const segundos = Number(etapaAtual?.duracao_segundos);
    const duracaoMs = Math.max(300, (Number.isFinite(segundos) ? segundos : 1.5) * 1000);
    const temFraseConcluida = Boolean(etapaAtual?.frase_concluida?.trim());
    const tempoConcluidaMs = temFraseConcluida ? Math.min(700, Math.round(duracaoMs * 0.4)) : 0;

    const timers = [setTimeout(() => setPasso((p) => p + 1), duracaoMs)];
    if (temFraseConcluida) {
      timers.push(setTimeout(() => setEtapaConcluida(true), duracaoMs - tempoConcluidaMs));
    }
    return () => timers.forEach(clearTimeout);
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

  const etapaAtualIndex = Math.min(passo, etapas.length - 1);
  const etapaAtualObj = etapas[etapaAtualIndex];
  const fraseExibida =
    passo < etapas.length && etapaConcluida && etapaAtualObj?.frase_concluida
      ? etapaAtualObj.frase_concluida
      : etapaAtualObj?.frase;
  const etapaAtualEstiloConcluido = passo >= etapas.length || etapaConcluida;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-10">
      <p className="mb-1 text-center text-lg font-extrabold text-ink">{t("carregando_titulo_topo")}</p>
      <p className="mb-8 text-center text-sm text-muted">{formatarTelefone(telefoneAtual)}</p>

      {fase === "animando" && (
        <div className="flex w-full flex-col gap-4">
          <p className="px-1 text-2xl font-extrabold leading-snug text-ink">
            {t("carregando_titulo")}
          </p>

          <div className="rounded-[1.75rem] bg-surface p-5 shadow-xl">
            <div className="relative mb-8 rounded-md border border-border bg-surface2 px-4 py-3.5">
              <div className="flex items-center justify-center gap-2.5">
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                    etapaAtualEstiloConcluido ? "bg-olive text-white" : "bg-amber text-ink"
                  }`}
                >
                  {etapaAtualEstiloConcluido ? (
                    <Check size={13} />
                  ) : (
                    <Loader2 size={13} className="animate-spin" />
                  )}
                </span>
                <p className="text-sm font-bold text-ink">{fraseExibida}</p>
              </div>
              <span className="absolute left-1/2 top-full -mt-1.5 h-3 w-3 -translate-x-1/2 rotate-45 border-b border-r border-border bg-surface2" />
            </div>

            <div className="flex w-full items-start">
              {etapas.map((etapa, i) => {
                const feito = i < passo;
                const ativo = i === passo;
                const ativoConcluido = ativo && etapaConcluida;
                const estiloFeito = feito || ativoConcluido;
                const proximaFeita = i + 1 < passo;
                const proximaAtiva = i + 1 === passo;
                return (
                  <div key={etapa.id ?? i} className="contents">
                    <div className="flex w-16 shrink-0 flex-col items-center gap-1.5 text-center">
                      <div
                        className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ring-4 ring-surface ${
                          estiloFeito ? "bg-olive text-white" : ativo ? "bg-amber text-ink" : "bg-surface2 text-muted"
                        }`}
                      >
                        {estiloFeito ? (
                          <Check size={14} />
                        ) : ativo ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          i + 1
                        )}
                      </div>
                      <p
                        className={`text-[10px] font-medium leading-tight ${
                          feito || ativo ? "text-ink" : "text-muted/60"
                        }`}
                      >
                        {estiloFeito && etapa.frase_concluida?.trim() ? etapa.frase_concluida : etapa.frase}
                      </p>
                    </div>
                    {i < etapas.length - 1 && (
                      <div
                        className={`-mx-1 mt-[11px] h-2.5 flex-1 rounded-full ${
                          proximaFeita
                            ? "bg-olive"
                            : proximaAtiva
                            ? "bg-gradient-to-r from-olive to-amber"
                            : "bg-surface2"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface2 px-3 py-1.5 text-[11px] text-muted">
              <Loader2 size={11} className="animate-spin" />
              Etapa {Math.min(passo + 1, etapas.length)} de {etapas.length}
            </div>
          </div>
        </div>
      )}

      {fase === "confirmando" && (
        <div className="w-full rounded-[1.75rem] bg-surface p-6 text-center shadow-xl">
          <div className="relative mx-auto mb-5 flex h-16 w-16 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-sky-400/30 blur-xl" />
            <Badge size={64} className="absolute inset-0 fill-sky-500 text-sky-500" />
            <Check size={28} strokeWidth={3} className="relative text-white" />
          </div>

          <p className="text-xl font-extrabold text-ink">{t("carregando_pergunta")}</p>
          <p className="mx-auto mt-1.5 max-w-[15rem] text-sm text-muted">{t("carregando_subtitulo")}</p>

          <div className="mx-auto mt-4 inline-block rounded-full border border-border bg-surface2 px-4 py-2 text-lg font-bold tracking-tight text-ink">
            {formatarTelefone(telefoneAtual)}
          </div>

          <div className="mt-6 flex w-full gap-2">
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
