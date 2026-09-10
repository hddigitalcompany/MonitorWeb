"use client";

import { useEffect, useState } from "react";
import { calcularEtapaReembolso, marcosDecorridos, formatarDuracao } from "@/lib/reembolso";

export default function StatusReembolso({ pedido, nomeUsuario }) {
  const [agora, setAgora] = useState(() => new Date());

  useEffect(() => {
    const intervalo = setInterval(() => setAgora(new Date()), 60000);
    return () => clearInterval(intervalo);
  }, []);

  const { concluido, horasDecorridas, textoRestante } = calcularEtapaReembolso(pedido.criado_em, agora);
  const marcos = marcosDecorridos(horasDecorridas).filter((m) => m < 96);

  return (
    <div className="card mb-6">
      <p className="mb-1 text-sm text-ink">Pedido de reembolso efetuado com sucesso</p>
      <p className="mb-4 text-xs text-amber">Em análise, acompanhe por aqui cada etapa.</p>

      <div className="flex flex-col gap-2.5">
        <div className="flex justify-start">
          <div className="max-w-[85%] rounded-sm border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-ink">
            Seu pedido de reembolso está em análise. Essa análise leva no máximo 4 dias, e você
            pode acompanhar por aqui o tempo que falta.
          </div>
        </div>

        {marcos.map((m) => (
          <div key={m} className="flex justify-start">
            <div className="max-w-[85%] rounded-sm border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-ink">
              {`Já se passaram ${formatarDuracao(m)} da sua análise. Falta ${textoRestante} pra completar o prazo de 4 dias.`}
            </div>
          </div>
        ))}

        {concluido && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-sm border border-olive bg-olive/10 px-3 py-2 text-sm leading-relaxed text-ink">
              {`Parabéns ${nomeUsuario}! seu pedido de reembolso foi efetuado com sucesso! O valor deve retornar a sua fatura dentro do prazo de processamento do seu Banco, por aqui, terminamos, caso reste alguma dúvida, não exite em nos contatar!`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
