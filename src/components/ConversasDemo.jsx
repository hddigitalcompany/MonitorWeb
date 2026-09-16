"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageCircle, Users } from "lucide-react";
import ConversaBolhas from "@/components/ConversaBolhas";

// Conversas de exemplo criadas pelo admin (aba "Conversas (exemplo)" da
// administração) — só pra mostrar como fica um chat de verdade aqui
// dentro. As mensagens de cada conversa só são buscadas quando a pessoa
// abre ela, pra não carregar tudo de uma vez.
export default function ConversasDemo({ conversas }) {
  const [abertaId, setAbertaId] = useState(null);
  const [mensagensPorConversa, setMensagensPorConversa] = useState({});
  const [carregandoId, setCarregandoId] = useState(null);
  const supabase = createClient();

  async function abrir(conversa) {
    if (abertaId === conversa.id) {
      setAbertaId(null);
      return;
    }
    setAbertaId(conversa.id);
    if (mensagensPorConversa[conversa.id]) return;

    setCarregandoId(conversa.id);
    const { data } = await supabase
      .from("mensagens_demo")
      .select("*")
      .eq("conversa_id", conversa.id)
      .order("ordem", { ascending: true });
    setMensagensPorConversa((atual) => ({
      ...atual,
      [conversa.id]: (data || []).map((m) => ({ ...m, dataHoraIso: m.enviado_em })),
    }));
    setCarregandoId(null);
  }

  if (conversas.length === 0) return null;

  return (
    <div className="mb-6">
      <p className="mb-2 text-xs text-muted">Conversas de exemplo</p>
      <div className="flex flex-col gap-2">
        {conversas.map((c) => (
          <div key={c.id} className="rounded-sm border border-border bg-surface p-3">
            <button onClick={() => abrir(c)} className="flex w-full items-center gap-2.5 text-left">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber/20 text-ink">
                {c.tipo === "grupo" ? <Users size={16} /> : <MessageCircle size={16} />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{c.titulo}</p>
                <p className="text-[11px] text-muted">{c.total_mensagens} mensagens</p>
              </div>
            </button>
            {abertaId === c.id && (
              <div className="mt-3 max-h-96 overflow-y-auto rounded-sm border border-border bg-base p-3">
                {carregandoId === c.id ? (
                  <p className="text-sm text-muted">Carregando...</p>
                ) : (
                  <ConversaBolhas
                    mensagens={mensagensPorConversa[c.id] || []}
                    participanteVoce={c.participante_voce}
                    tipo={c.tipo}
                    participantes={c.participantes || []}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
