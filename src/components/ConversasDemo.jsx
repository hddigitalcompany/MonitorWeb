"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageCircle, Users, Send } from "lucide-react";
import ConversaBolhas from "@/components/ConversaBolhas";

const EMOJIS_RAPIDOS = ["😀", "😂", "❤️", "👍", "🙏", "😊", "😢", "🎉"];

// Conversas de exemplo criadas pelo admin (aba "Conversas (exemplo)" da
// administração) — mostra como fica um chat de verdade aqui dentro, e a
// pessoa pode escrever também, continuando a conversa como se fosse ela
// mesma (entra do lado direito, junto com as mensagens dela). O que ela
// escreve fica salvo só pra ela — outro cliente que abrir essa mesma
// conversa de exemplo não vê.
export default function ConversasDemo({ conversas, userId }) {
  const [abertaId, setAbertaId] = useState(null);
  const [mensagensPorConversa, setMensagensPorConversa] = useState({});
  const [carregandoId, setCarregandoId] = useState(null);
  const [rascunho, setRascunho] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [aberturaPorConversa, setAberturaPorConversa] = useState({});
  const [, forcarAtualizacao] = useState(0);
  const supabase = createClient();

  // Enquanto tiver uma conversa com liberação gradual aberta, atualiza a
  // tela de tempos em tempos pra novas mensagens antigas irem aparecendo
  // sozinhas, sem precisar fechar e abrir a conversa de novo.
  useEffect(() => {
    const conversaAberta = conversas.find((c) => c.id === abertaId);
    if (!conversaAberta?.liberacao_intervalo_minutos) return;
    const id = setInterval(() => forcarAtualizacao((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, [abertaId, conversas]);

  async function abrir(conversa) {
    if (abertaId === conversa.id) {
      setAbertaId(null);
      return;
    }
    setAbertaId(conversa.id);
    setRascunho("");

    if (conversa.liberacao_intervalo_minutos && !aberturaPorConversa[conversa.id]) {
      const { data: progresso } = await supabase
        .from("conversas_demo_progresso")
        .select("primeira_abertura")
        .eq("conversa_id", conversa.id)
        .eq("user_id", userId)
        .maybeSingle();

      let primeiraAbertura = progresso?.primeira_abertura;
      if (!primeiraAbertura) {
        primeiraAbertura = new Date().toISOString();
        await supabase
          .from("conversas_demo_progresso")
          .insert({ conversa_id: conversa.id, user_id: userId, primeira_abertura: primeiraAbertura });
      }
      setAberturaPorConversa((atual) => ({ ...atual, [conversa.id]: primeiraAbertura }));
    }

    if (mensagensPorConversa[conversa.id]) return;

    setCarregandoId(conversa.id);
    const { data } = await supabase
      .from("mensagens_demo")
      .select("*")
      .eq("conversa_id", conversa.id)
      .order("ordem", { ascending: true, nullsFirst: false })
      .order("criado_em", { ascending: true });
    setMensagensPorConversa((atual) => ({
      ...atual,
      [conversa.id]: (data || []).map((m) => ({ ...m, dataHoraIso: m.enviado_em })),
    }));
    setCarregandoId(null);
  }

  // Se a conversa tiver liberação gradual, mostra só uma parte das
  // mensagens do roteiro (as que não foram escritas pelo próprio
  // cliente), liberando uma a mais a cada N minutos desde a primeira
  // vez que a pessoa abriu essa conversa. As mensagens que a própria
  // pessoa escreveu continuando a conversa sempre aparecem.
  function mensagensVisiveis(conversa) {
    const todas = mensagensPorConversa[conversa.id] || [];
    const intervalo = conversa.liberacao_intervalo_minutos;
    const abertura = aberturaPorConversa[conversa.id];
    if (!intervalo || intervalo <= 0 || !abertura) return { visiveis: todas, faltam: 0 };

    const doRoteiro = todas.filter((m) => m.user_id == null);
    const proprias = todas.filter((m) => m.user_id != null);
    const minutosPassados = (Date.now() - new Date(abertura).getTime()) / 60000;
    const quantidade = Math.min(doRoteiro.length, 1 + Math.floor(minutosPassados / intervalo));

    return { visiveis: [...doRoteiro.slice(0, quantidade), ...proprias], faltam: doRoteiro.length - quantidade };
  }

  async function enviar(conversa) {
    const texto = rascunho.trim();
    if (!texto || enviando) return;
    setEnviando(true);

    const { data: nova, error } = await supabase
      .from("mensagens_demo")
      .insert({
        conversa_id: conversa.id,
        user_id: userId,
        remetente: conversa.participante_voce,
        texto,
      })
      .select()
      .single();

    if (!error && nova) {
      setMensagensPorConversa((atual) => ({
        ...atual,
        [conversa.id]: [...(atual[conversa.id] || []), { ...nova, dataHoraIso: nova.enviado_em }],
      }));
      setRascunho("");
    }
    setEnviando(false);
  }

  function adicionarEmoji(emoji) {
    setRascunho((atual) => atual + emoji);
  }

  if (conversas.length === 0) return null;

  return (
    <div className="mb-6">
      <p className="mb-2 text-xs text-muted">Conversas de exemplo</p>
      <div className="flex flex-col gap-2">
        {conversas.map((c) => (
          <div key={c.id} className="rounded-sm border border-border bg-surface p-3">
            <button onClick={() => abrir(c)} className="flex w-full items-center gap-2.5 text-left">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-amber/20 text-ink">
                {c.foto_url ? (
                  <img src={c.foto_url} alt="" className="h-full w-full object-cover" />
                ) : c.tipo === "grupo" ? (
                  <Users size={16} />
                ) : (
                  <MessageCircle size={16} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-ink">{c.titulo}</p>
                <p className="text-[11px] text-muted">{c.total_mensagens} mensagens</p>
              </div>
            </button>
            {abertaId === c.id && (
              <div className="mt-3">
                <div
                  ref={(el) => {
                    if (el) el.scrollTop = el.scrollHeight;
                  }}
                  className="mb-2 max-h-96 overflow-y-auto rounded-sm border border-border bg-base p-3"
                >
                  {carregandoId === c.id ? (
                    <p className="text-sm text-muted">Carregando...</p>
                  ) : (
                    <ConversaBolhas
                      mensagens={mensagensVisiveis(c).visiveis}
                      participanteVoce={c.participante_voce}
                      tipo={c.tipo}
                      participantes={c.participantes || []}
                    />
                  )}
                </div>

                {carregandoId !== c.id && mensagensVisiveis(c).faltam > 0 && (
                  <p className="mb-2 text-[11px] text-muted">Mensagens mais antigas ainda vão aparecer aos poucos.</p>
                )}

                <div className="mb-2 flex gap-1">
                  {EMOJIS_RAPIDOS.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => adicionarEmoji(emoji)}
                      className="rounded-sm border border-border px-1.5 py-1 text-base leading-none"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    value={rascunho}
                    onChange={(e) => setRascunho(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && enviar(c)}
                    placeholder="Escreva uma mensagem..."
                    className="field-input"
                  />
                  <button
                    onClick={() => enviar(c)}
                    disabled={enviando || !rascunho.trim()}
                    className="btn-primary shrink-0 px-3"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
