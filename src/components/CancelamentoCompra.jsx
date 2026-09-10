"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft } from "lucide-react";

function Bolha({ children, destaque = false }) {
  return (
    <div className="flex justify-start">
      <div
        className={`max-w-[85%] rounded-sm px-3 py-2 text-sm leading-relaxed ${
          destaque ? "border border-olive bg-olive/10 text-ink" : "border border-border bg-surface text-ink"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

export default function CancelamentoCompra({ userId, nomeUsuario, onConcluido, onFechar }) {
  const [etapa, setEtapa] = useState("confirmacao");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");
  const supabase = createClient();

  useEffect(() => {
    if (etapa === "verificando") {
      const t = setTimeout(() => setEtapa("elegivel"), 1800);
      return () => clearTimeout(t);
    }
  }, [etapa]);

  async function enviarPedido() {
    setEtapa("enviando");
    setErro("");

    const { data: novo, error } = await supabase
      .from("pedidos_reembolso")
      .insert({ user_id: userId, motivo: motivo.trim() })
      .select()
      .single();

    if (error || !novo) {
      setErro("Não deu pra enviar o pedido agora. Tenta de novo em instantes.");
      setEtapa("elegivel");
      return;
    }

    setTimeout(() => {
      onConcluido(novo);
    }, 1200);
  }

  return (
    <div>
      <button onClick={onFechar} className="mb-4 flex items-center gap-1.5 text-sm text-muted">
        <ArrowLeft size={15} /> Voltar
      </button>

      {etapa === "confirmacao" && (
        <div className="card">
          <p className="mb-3 text-sm leading-relaxed text-ink">
            Ao continuar, sua compra será cancelada e o acesso ao aplicativo será encerrado. O
            valor pago entra em análise: se a sua compra estiver dentro de 7 dias, você recebe o
            valor integral de volta.
          </p>
          <div className="flex gap-2">
            <button onClick={onFechar} className="flex-1 rounded-sm border border-border px-3 py-2 text-sm text-ink">
              Desistir
            </button>
            <button
              onClick={() => setEtapa("motivo")}
              className="flex-1 rounded-sm border border-rust px-3 py-2 text-sm text-rust"
            >
              Continuar o cancelamento
            </button>
          </div>
        </div>
      )}

      {etapa === "motivo" && (
        <div className="card">
          <p className="mb-3 text-sm text-ink">
            Antes de continuar, conta pra gente o que deixou você insatisfeita:
          </p>
          <textarea
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            rows={4}
            placeholder="Conte com detalhes o que aconteceu"
            className="field-input mb-3 resize-none"
          />
          <button
            onClick={() => motivo.trim() && setEtapa("agente")}
            disabled={!motivo.trim()}
            className="btn-primary w-full"
          >
            Continuar
          </button>
        </div>
      )}

      {etapa === "agente" && (
        <div className="card">
          <div className="mb-4 flex flex-col gap-2.5">
            <Bolha>
              {`Olá, ${nomeUsuario} tudo bem? Me chamo Julia, e faço parte do atendimento e central de contas, recebemos sua insatisfação e seu desejo de cancelar a conta.`}
            </Bolha>
            <Bolha>Se confirmar vou dar continuidade na solicitação de reembolso do seu pedido, está de acordo?</Bolha>
          </div>
          <div className="flex gap-2">
            <button onClick={onFechar} className="flex-1 rounded-sm border border-border px-3 py-2 text-sm text-ink">
              Cancelar
            </button>
            <button onClick={() => setEtapa("verificando")} className="flex-1 btn-primary">
              Continuar
            </button>
          </div>
        </div>
      )}

      {etapa === "verificando" && (
        <div className="card">
          <div className="flex flex-col gap-2.5">
            <Bolha>Verificando sua compra...</Bolha>
          </div>
        </div>
      )}

      {etapa === "elegivel" && (
        <div className="card">
          <div className="mb-4 flex flex-col gap-2.5">
            <Bolha destaque>
              Verifiquei e ressaltamos que sua compra está dentro do prazo e elegível para
              reembolso, conforme você me pediu eu vou dar prosseguimento no seu pedido e farei o
              cancelamento...
            </Bolha>
            <Bolha destaque>
              {`O pedido vai para análise ${nomeUsuario}, tudo bem? Essa análise leva no máximo 4 dias, e após isso você poderá acompanhar por aqui o pedido de reembolso.`}
            </Bolha>
          </div>
          {erro && <p className="mb-2 text-xs text-rust">{erro}</p>}
          <button onClick={enviarPedido} className="btn-primary w-full">
            Confirmar pedido de reembolso
          </button>
        </div>
      )}

      {etapa === "enviando" && (
        <div className="card">
          <div className="flex flex-col gap-2.5">
            <Bolha>Enviando pedido...</Bolha>
          </div>
        </div>
      )}
    </div>
  );
}
