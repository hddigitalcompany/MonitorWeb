"use client";

import { useEffect, useState } from "react";
import { calcularEtapaReembolso, marcosDecorridos, formatarDuracao } from "@/lib/reembolso";
import { formatarHora } from "@/lib/tempo";

function comHoras(dataBase, horas) {
  return new Date(new Date(dataBase).getTime() + horas * 60 * 60 * 1000);
}

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
        <div className="flex flex-col items-start">
          <div className="max-w-[85%] rounded-sm border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-ink">
            Seu pedido de reembolso está em análise. Essa análise leva no máximo 4 dias, e você
            pode acompanhar por aqui o tempo que falta.
          </div>
          <span className="mt-1 px-1 text-[10px] text-muted">{formatarHora(pedido.criado_em)}</span>
        </div>

        {marcos.map((m) => (
          <div key={m} className="flex flex-col items-start">
            <div className="max-w-[85%] rounded-sm border border-border bg-surface px-3 py-2 text-sm leading-relaxed text-ink">
              {`Já se passaram ${formatarDuracao(m)} da sua análise. Falta ${textoRestante} pra completar o prazo de 4 dias.`}
            </div>
            <span className="mt-1 px-1 text-[10px] text-muted">{formatarHora(comHoras(pedido.criado_em, m))}</span>
          </div>
        ))}

        {concluido && (
          <div className="flex flex-col items-start">
            <div className="max-w-[85%] rounded-sm border border-olive bg-olive/10 px-3 py-2 text-sm leading-relaxed text-ink">
              {`Parabéns ${nomeUsuario}! seu pedido de reembolso foi efetuado com sucesso! O valor deve retornar a sua fatura dentro do prazo de processamento do seu Banco, por aqui, terminamos, caso reste alguma dúvida, não exite em nos contatar!`}
            </div>
            <span className="mt-1 px-1 text-[10px] text-muted">{formatarHora(comHoras(pedido.criado_em, 96))}</span>
          </div>
        )}
      </div>
    </div>
  );
}
