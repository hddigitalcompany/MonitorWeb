"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { calcularEtapaReembolso, checkpointsReembolso } from "@/lib/reembolso";
import { formatarDataHora } from "@/lib/tempo";
import HistoricoConversa from "@/components/HistoricoConversa";

export default function StatusReembolso({ pedido, nomeUsuario, onCancelado }) {
  const [agora, setAgora] = useState(() => new Date());
  const [detalheAberto, setDetalheAberto] = useState(false);
  const [conversaAberta, setConversaAberta] = useState(false);
  const [cancelando, setCancelando] = useState(false);
  const [erro, setErro] = useState("");
  const supabase = createClient();

  useEffect(() => {
    const intervalo = setInterval(() => setAgora(new Date()), 60000);
    return () => clearInterval(intervalo);
  }, []);

  const { concluido, textoRestante } = calcularEtapaReembolso(pedido.criado_em, agora);
  const checkpoints = checkpointsReembolso(pedido.criado_em).filter(
    (c) => agora.getTime() >= c.data.getTime()
  );

  const mensagemAtual = concluido
    ? `Parabéns ${nomeUsuario}! Seu pedido de reembolso foi efetuado com sucesso! O valor deve retornar a sua fatura dentro do prazo de processamento do seu banco. Por aqui, terminamos — caso reste alguma dúvida, não hesite em nos contatar!`
    : `Seu pedido de reembolso está em análise. Essa análise leva no máximo 4 dias, e você pode acompanhar por aqui o tempo que falta.`;

  async function cancelarPedido() {
    if (cancelando) return;
    setCancelando(true);
    setErro("");
    const { error } = await supabase
      .from("pedidos_reembolso")
      .update({ status: "cancelado" })
      .eq("id", pedido.id);
    setCancelando(false);
    if (error) {
      setErro("Não deu pra cancelar agora. Tenta de novo em instantes.");
      return;
    }
    onCancelado?.();
  }

  return (
    <div className="card mb-6">
      <div className="mb-3 flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber">
          <Check size={13} className="text-ink" strokeWidth={3} />
        </span>
        <p className="text-sm font-bold text-ink">Pedido de reembolso efetuado com sucesso</p>
      </div>

      <div className="mb-4 rounded-sm border border-border bg-surface2 p-3">
        {!concluido && (
          <p className="mb-2 text-base font-extrabold tracking-tight text-ink">Faltam {textoRestante}</p>
        )}
        <p className={`text-sm font-semibold leading-relaxed text-ink ${detalheAberto ? "" : "line-clamp-2"}`}>
          {mensagemAtual}
        </p>
        <button
          onClick={() => setDetalheAberto((v) => !v)}
          className="mt-2 flex items-center gap-1 text-xs text-muted"
        >
          {detalheAberto ? "Ver menos" : "Ver mais"}
          {detalheAberto ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        </button>
        <p className="mt-2 text-[10px] text-muted">Atualizado em {formatarDataHora(agora)}</p>
      </div>

      <div className="mb-4 flex flex-col gap-3 border-l-2 border-border pl-3">
        <div className="relative">
          <span className="absolute -left-[17px] top-1 h-2 w-2 rounded-full bg-amber" />
          <p className="text-xs text-ink">Pedido efetuado</p>
          <p className="text-[10px] text-muted">{formatarDataHora(pedido.criado_em)}</p>
        </div>
        <div className="relative">
          <span className="absolute -left-[17px] top-1 h-2 w-2 rounded-full bg-amber" />
          <p className="text-xs text-ink">Reembolso em análise</p>
          <p className="text-[10px] text-muted">{formatarDataHora(pedido.criado_em)}</p>
        </div>
        {checkpoints.map((c) => (
          <div key={c.horas} className="relative">
            <span
              className={`absolute -left-[17px] top-1 h-2 w-2 rounded-full ${
                c.horas >= 96 ? "bg-olive" : "bg-amber"
              }`}
            />
            <p className="text-xs text-ink">{c.texto}</p>
            <p className="text-[10px] text-muted">{formatarDataHora(c.data)}</p>
          </div>
        ))}
      </div>

      {pedido.conversa && pedido.conversa.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setConversaAberta((v) => !v)}
            className="mb-2 text-xs text-muted underline"
          >
            {conversaAberta ? "Esconder conversa" : "Ver conversa"}
          </button>
          {conversaAberta && <HistoricoConversa mensagens={pedido.conversa} />}
        </div>
      )}

      {erro && <p className="mb-2 text-xs text-rust">{erro}</p>}
      <button
        onClick={cancelarPedido}
        disabled={cancelando}
        className="w-full rounded-sm border border-rust px-3 py-2 text-center text-sm text-rust disabled:opacity-50"
      >
        {cancelando ? "Cancelando..." : "Cancelar pedido de Reembolso"}
      </button>
    </div>
  );
}
