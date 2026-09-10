"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";

function Bolha({ de, texto, destaque = false }) {
  const propria = de === "usuario";
  return (
    <div className={`flex ${propria ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-sm px-3 py-2 text-sm leading-relaxed ${
          propria
            ? "bg-amber text-base"
            : destaque
            ? "border border-olive bg-olive/10 text-ink"
            : "border border-border bg-surface text-ink"
        }`}
      >
        {texto}
      </div>
    </div>
  );
}

function BolhaDigitando() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-sm border border-border bg-surface px-3 py-2.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
      </div>
    </div>
  );
}

export default function CancelamentoCompra({ userId, nomeUsuario, onConcluido, onFechar }) {
  const [mensagens, setMensagens] = useState([]);
  const [digitando, setDigitando] = useState(false);
  const [etapa, setEtapa] = useState("inicio");
  const [motivoInput, setMotivoInput] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");
  const contadorId = useRef(0);
  const fimRef = useRef(null);
  const supabase = createClient();

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens, digitando, etapa]);

  function proximoId() {
    contadorId.current += 1;
    return contadorId.current;
  }

  function falarUsuario(texto) {
    setMensagens((atuais) => [...atuais, { id: proximoId(), de: "usuario", texto }]);
  }

  async function falarBot(texto, { delay, destaque = false } = {}) {
    // Quanto maior a mensagem, mais tempo ela "leva pra ser digitada" —
    // fica mais parecido com uma conversa de verdade em vez de instantâneo.
    const atraso = delay ?? Math.min(3200, Math.max(1300, texto.length * 25));
    setDigitando(true);
    await new Promise((resolve) => setTimeout(resolve, atraso));
    setDigitando(false);
    setMensagens((atuais) => [...atuais, { id: proximoId(), de: "bot", texto, destaque }]);
  }

  useEffect(() => {
    (async () => {
      await falarBot(
        "Ao continuar, sua compra será cancelada e o acesso ao aplicativo será encerrado. O valor pago entra em análise: se a sua compra estiver dentro de 7 dias, você recebe o valor integral de volta."
      );
      setEtapa("aguardando_confirmacao");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function escolherDesistir() {
    falarUsuario("Desistir");
    setEtapa("encerrado");
    setTimeout(onFechar, 500);
  }

  async function escolherContinuarCancelamento() {
    falarUsuario("Continuar o cancelamento");
    setEtapa("processando");
    await falarBot("Antes de continuar, conta pra gente o que deixou você insatisfeita:");
    setEtapa("aguardando_motivo");
  }

  async function enviarMotivo() {
    if (!motivoInput.trim()) return;
    const texto = motivoInput.trim();
    falarUsuario(texto);
    setMotivo(texto);
    setMotivoInput("");
    setEtapa("processando");

    await falarBot(
      `Olá, ${nomeUsuario} tudo bem? Me chamo Julia, e faço parte do atendimento e central de contas, recebemos sua insatisfação e seu desejo de cancelar a conta.`
    );
    await falarBot("Se confirmar vou dar continuidade na solicitação de reembolso do seu pedido, está de acordo?");
    setEtapa("aguardando_agente");
  }

  async function agenteCancelar() {
    falarUsuario("Cancelar");
    setEtapa("encerrado");
    setTimeout(onFechar, 500);
  }

  async function agenteContinuar() {
    falarUsuario("Continuar");
    setEtapa("processando");
    await falarBot("Verificando sua compra...", { delay: 2200 });
    await falarBot(
      "Verifiquei e ressaltamos que sua compra está dentro do prazo e elegível para reembolso, conforme você me pediu eu vou dar prosseguimento no seu pedido e farei o cancelamento...",
      { destaque: true }
    );
    await falarBot(
      `O pedido vai para análise ${nomeUsuario}, tudo bem? Essa análise leva no máximo 4 dias, e após isso você poderá acompanhar por aqui o pedido de reembolso.`,
      { destaque: true }
    );
    setEtapa("aguardando_confirmacao_final");
  }

  async function confirmarEnvio() {
    falarUsuario("Sim, pode confirmar");
    setErro("");
    setEtapa("processando");
    await falarBot("Enviando pedido...", { delay: 2000 });

    const { data: novo, error } = await supabase
      .from("pedidos_reembolso")
      .insert({ user_id: userId, motivo: motivo.trim() })
      .select()
      .single();

    if (error || !novo) {
      await falarBot("Não deu pra enviar o pedido agora. Tenta de novo em instantes.");
      setErro("Não deu pra enviar o pedido agora. Tenta de novo em instantes.");
      setEtapa("aguardando_confirmacao_final");
      return;
    }

    await falarBot("Pedido de reembolso efetuado com sucesso!", { destaque: true });
    await falarBot("Em análise, acompanhe por aqui cada etapa.", { delay: 700, destaque: true });
    setEtapa("concluido");
    setTimeout(() => onConcluido(novo), 900);
  }

  return (
    <div>
      <button onClick={onFechar} className="mb-4 flex items-center gap-1.5 text-sm text-muted">
        <ArrowLeft size={15} /> Voltar
      </button>

      <div className="mb-4 flex flex-col gap-2.5">
        {mensagens.map((m) => (
          <Bolha key={m.id} de={m.de} texto={m.texto} destaque={m.destaque} />
        ))}
        {digitando && <BolhaDigitando />}
        <div ref={fimRef} />
      </div>

      {etapa === "aguardando_confirmacao" && (
        <div className="flex gap-2">
          <button onClick={escolherDesistir} className="flex-1 rounded-sm border border-border px-3 py-2 text-sm text-ink">
            Desistir
          </button>
          <button
            onClick={escolherContinuarCancelamento}
            className="flex-1 rounded-sm border border-rust px-3 py-2 text-sm text-rust"
          >
            Continuar o cancelamento
          </button>
        </div>
      )}

      {etapa === "aguardando_motivo" && (
        <div className="card">
          <textarea
            value={motivoInput}
            onChange={(e) => setMotivoInput(e.target.value)}
            rows={3}
            placeholder="Conte com detalhes o que aconteceu"
            className="field-input mb-3 resize-none"
          />
          <button onClick={enviarMotivo} disabled={!motivoInput.trim()} className="btn-primary w-full">
            Enviar
          </button>
        </div>
      )}

      {etapa === "aguardando_agente" && (
        <div className="flex gap-2">
          <button onClick={agenteCancelar} className="flex-1 rounded-sm border border-border px-3 py-2 text-sm text-ink">
            Cancelar
          </button>
          <button onClick={agenteContinuar} className="flex-1 btn-primary">
            Continuar
          </button>
        </div>
      )}

      {etapa === "aguardando_confirmacao_final" && (
        <div>
          {erro && <p className="mb-2 text-xs text-rust">{erro}</p>}
          <button onClick={confirmarEnvio} className="btn-primary w-full">
            Sim, pode confirmar
          </button>
        </div>
      )}
    </div>
  );
}
