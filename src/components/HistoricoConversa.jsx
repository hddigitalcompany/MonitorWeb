import ChatBolha from "@/components/ChatBolha";

// Reconstrói, sem nenhuma animação, a conversa de cancelamento que já
// aconteceu — salva junto com o pedido de reembolso — pra pessoa poder ver
// de novo depois, como um histórico.
export default function HistoricoConversa({ mensagens = [] }) {
  if (!mensagens.length) return null;
  return (
    <div className="flex flex-col gap-2.5 rounded-sm border border-border bg-surface2 p-3">
      {mensagens.map((m, i) => (
        <ChatBolha key={i} de={m.de} texto={m.texto} destaque={m.destaque} hora={m.hora} />
      ))}
    </div>
  );
}
