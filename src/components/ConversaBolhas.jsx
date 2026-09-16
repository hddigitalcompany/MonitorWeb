"use client";

import { formatarHora } from "@/lib/tempo";

// Uma cor consistente por remetente (só pra separar visualmente quem é
// quem numa conversa de grupo — não tem significado nenhum além disso).
const CORES_REMETENTE = ["text-olive", "text-rust", "text-amber", "text-ink"];

function corDoRemetente(nome, participantes) {
  const indice = Math.max(0, participantes.indexOf(nome));
  return CORES_REMETENTE[indice % CORES_REMETENTE.length];
}

// Renderiza uma lista de mensagens como um chat de verdade: quem é
// "participanteVoce" fica alinhado à direita (balão amarelo, como você
// mesmo escrevendo), o resto fica à esquerda. Em conversa de grupo,
// mostra o nome de quem escreveu em cima do balão (como o WhatsApp faz).
export default function ConversaBolhas({ mensagens, participanteVoce, tipo, participantes = [] }) {
  if (!mensagens || mensagens.length === 0) {
    return <p className="text-sm text-muted">Essa conversa ainda não tem mensagens.</p>;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {mensagens.map((m, i) => {
        const propria = m.remetente === participanteVoce;
        const mostrarNome = tipo === "grupo" && !propria && m.remetente !== mensagens[i - 1]?.remetente;
        return (
          <div key={m.id ?? i} className={`flex flex-col ${propria ? "items-end" : "items-start"}`}>
            {mostrarNome && (
              <span className={`mb-0.5 px-1 text-[11px] font-medium ${corDoRemetente(m.remetente, participantes)}`}>
                {m.remetente}
              </span>
            )}
            <div
              className={`max-w-[80%] whitespace-pre-line rounded-sm px-3 py-2 text-sm leading-relaxed ${
                propria ? "bg-amber text-ink" : "border border-border bg-surface text-ink"
              }`}
            >
              {m.texto}
            </div>
            {m.dataHoraIso && <span className="mt-1 px-1 text-[10px] text-muted">{formatarHora(m.dataHoraIso)}</span>}
          </div>
        );
      })}
    </div>
  );
}
