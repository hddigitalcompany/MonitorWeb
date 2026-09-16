"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageCircle, Users, Send } from "lucide-react";
import ConversaBolhas from "@/components/ConversaBolhas";
import { quantidadeVisivelConversa } from "@/lib/liberacaoConversa";
import { texto } from "@/lib/textos";

const EMOJIS_RAPIDOS = ["😀", "😂", "❤️", "👍", "🙏", "😊", "😢", "🎉"];

// Conversas de exemplo criadas pelo admin (aba "Conversas (exemplo)" da
// administração) — mostra como fica um chat de verdade aqui dentro, e a
// pessoa pode escrever também, continuando a conversa como se fosse ela
// mesma (entra do lado direito, junto com as mensagens dela). O que ela
// escreve fica salvo só pra ela — outro cliente que abrir essa mesma
// conversa de exemplo não vê.
export default function ConversasDemo({ conversas, userId, textos }) {
  const [abertaId, setAbertaId] = useState(null);
  const [roteiroPorConversa, setRoteiroPorConversa] = useState({});
  const [carregandoRoteiro, setCarregandoRoteiro] = useState(true);
  const [propriasPorConversa, setPropriasPorConversa] = useState({});
  const [carregandoId, setCarregandoId] = useState(null);
  const [rascunho, setRascunho] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [progressoPorConversa, setProgressoPorConversa] = useState({});
  const [, forcarAtualizacao] = useState(0);
  const supabase = createClient();

  // Busca de uma vez as mensagens do "roteiro" (escritas pelo admin) de
  // todas as conversas de exemplo — precisa disso já de cara pra poder
  // calcular o balãozinho de não lidas na lista, sem esperar a pessoa
  // abrir cada conversa.
  useEffect(() => {
    supabase
      .from("mensagens_demo")
      .select("*")
      .is("user_id", null)
      .order("ordem", { ascending: true, nullsFirst: false })
      .order("criado_em", { ascending: true })
      .then(({ data }) => {
        const mapa = {};
        (data || []).forEach((m) => {
          if (!mapa[m.conversa_id]) mapa[m.conversa_id] = [];
          mapa[m.conversa_id].push({ ...m, dataHoraIso: m.enviado_em });
        });
        setRoteiroPorConversa(mapa);
        setCarregandoRoteiro(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Busca de uma vez o progresso da pessoa em todas as conversas de
  // exemplo (quando abriu cada uma pela primeira vez e quantas
  // mensagens já leu) — também alimenta o balãozinho de não vistas.
  useEffect(() => {
    supabase
      .from("conversas_demo_progresso")
      .select("*")
      .eq("user_id", userId)
      .then(({ data }) => {
        const mapa = {};
        (data || []).forEach((p) => {
          mapa[p.conversa_id] = p;
        });
        setProgressoPorConversa(mapa);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Enquanto tiver alguma conversa com liberação gradual, atualiza a
  // tela de tempos em tempos pra os balõezinhos e as mensagens antigas
  // irem aparecendo sozinhos, sem precisar recarregar a página.
  useEffect(() => {
    const temLiberacao = conversas.some(
      (c) => c.liberacao_intervalo_minutos || c.liberacao_intervalo_enviadas_minutos || c.liberacao_intervalo_recebidas_minutos
    );
    if (!temLiberacao) return;
    const id = setInterval(() => forcarAtualizacao((t) => t + 1), 30000);
    return () => clearInterval(id);
  }, [conversas]);

  function quantidadeVisivelAgora(conversa) {
    return quantidadeVisivelConversa({
      conversa,
      doRoteiro: roteiroPorConversa[conversa.id] || [],
      primeiraAbertura: progressoPorConversa[conversa.id]?.primeira_abertura,
    });
  }

  function naoLidas(conversa) {
    const visivelAgora = quantidadeVisivelAgora(conversa);
    const lidas = progressoPorConversa[conversa.id]?.mensagens_lidas || 0;
    return Math.max(0, visivelAgora - lidas);
  }

  async function marcarComoLida(conversa) {
    let progresso = progressoPorConversa[conversa.id];

    if (!progresso) {
      const agora = new Date().toISOString();
      await supabase
        .from("conversas_demo_progresso")
        .insert({ conversa_id: conversa.id, user_id: userId, primeira_abertura: agora });
      progresso = { conversa_id: conversa.id, user_id: userId, primeira_abertura: agora, mensagens_lidas: 0 };
    }

    const visivelAgora = quantidadeVisivelConversa({
      conversa,
      doRoteiro: roteiroPorConversa[conversa.id] || [],
      primeiraAbertura: progresso.primeira_abertura,
    });

    if (visivelAgora !== progresso.mensagens_lidas) {
      await supabase
        .from("conversas_demo_progresso")
        .update({ mensagens_lidas: visivelAgora })
        .eq("conversa_id", conversa.id)
        .eq("user_id", userId);
    }

    setProgressoPorConversa((atual) => ({
      ...atual,
      [conversa.id]: { ...progresso, mensagens_lidas: visivelAgora },
    }));
  }

  async function abrir(conversa) {
    if (abertaId === conversa.id) {
      setAbertaId(null);
      return;
    }
    setAbertaId(conversa.id);
    setRascunho("");

    if (!propriasPorConversa[conversa.id]) {
      setCarregandoId(conversa.id);
      const { data } = await supabase
        .from("mensagens_demo")
        .select("*")
        .eq("conversa_id", conversa.id)
        .eq("user_id", userId)
        .order("criado_em", { ascending: true });
      setPropriasPorConversa((atual) => ({
        ...atual,
        [conversa.id]: (data || []).map((m) => ({ ...m, dataHoraIso: m.enviado_em })),
      }));
      setCarregandoId(null);
    }

    marcarComoLida(conversa);
  }

  // Junta o que já está liberado do roteiro com as mensagens que a
  // própria pessoa escreveu continuando a conversa (essas sempre
  // aparecem, não entram na liberação gradual).
  function mensagensVisiveis(conversa) {
    const doRoteiro = roteiroPorConversa[conversa.id] || [];
    const proprias = propriasPorConversa[conversa.id] || [];

    const quantidade = quantidadeVisivelConversa({
      conversa,
      doRoteiro,
      primeiraAbertura: progressoPorConversa[conversa.id]?.primeira_abertura,
    });

    return { visiveis: [...doRoteiro.slice(0, quantidade), ...proprias], faltam: doRoteiro.length - quantidade };
  }

  async function enviar(conversa) {
    const textoMensagem = rascunho.trim();
    if (!textoMensagem || enviando) return;
    setEnviando(true);

    const { data: nova, error } = await supabase
      .from("mensagens_demo")
      .insert({
        conversa_id: conversa.id,
        user_id: userId,
        remetente: conversa.participante_voce,
        texto: textoMensagem,
      })
      .select()
      .single();

    if (!error && nova) {
      setPropriasPorConversa((atual) => ({
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
      <p className="mb-2 text-xs text-muted">{texto(textos, "conversas_demo_titulo")}</p>
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
              {abertaId !== c.id && !carregandoRoteiro && naoLidas(c) > 0 && (
                <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-amber px-1.5 text-[11px] font-semibold text-ink">
                  {naoLidas(c)}
                </span>
              )}
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
