"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MessageCircle, Users, Send, Plus, Search } from "lucide-react";
import { texto } from "@/lib/textos";

const EMOJIS_RAPIDOS = ["😀", "😂", "❤️", "👍", "🙏", "😊", "😢", "🎉"];

// Conversas de verdade entre clientes: a pessoa abre uma conversa nova,
// escolhe uma ou mais pessoas do app na lista, e troca mensagens de
// verdade com elas em tempo real. Diferente das "conversas de exemplo"
// (ConversasDemo.jsx), que são roteiros prontos criados pelo admin —
// aqui quem escreve é o próprio cliente, dos dois lados.
export default function ConversasReais({ userId, textos }) {
  const [conversas, setConversas] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [mostrarSeletor, setMostrarSeletor] = useState(false);
  const [pessoas, setPessoas] = useState([]);
  const [carregandoPessoas, setCarregandoPessoas] = useState(false);
  const [buscaPessoa, setBuscaPessoa] = useState("");
  const [selecionados, setSelecionados] = useState([]);
  const [abertaId, setAbertaId] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [nomesPorConversa, setNomesPorConversa] = useState({});
  const [carregandoMensagens, setCarregandoMensagens] = useState(false);
  const [rascunho, setRascunho] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const supabase = createClient();

  useEffect(() => {
    carregarConversas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregarConversas() {
    setCarregando(true);
    const { data: minhas, error: erroMinhas } = await supabase
      .from("conversas_reais_participantes")
      .select("conversa_id")
      .eq("user_id", userId);

    if (erroMinhas) {
      console.error("[conversas_reais] erro ao buscar minhas conversas:", erroMinhas.message);
      setErro(`Não deu pra carregar suas conversas agora (${erroMinhas.code || "?"}: ${erroMinhas.message}).`);
    }

    const idsConversas = (minhas || []).map((p) => p.conversa_id);
    if (idsConversas.length === 0) {
      setConversas([]);
      setCarregando(false);
      return;
    }

    const [{ data: conversasData }, { data: participantesData }] = await Promise.all([
      supabase
        .from("conversas_reais")
        .select("*")
        .in("id", idsConversas)
        .order("ultima_mensagem_em", { ascending: false }),
      supabase.from("conversas_reais_participantes").select("conversa_id, user_id").in("conversa_id", idsConversas),
    ]);

    const idsOutros = [...new Set((participantesData || []).filter((p) => p.user_id !== userId).map((p) => p.user_id))];
    const { data: pessoasData } = idsOutros.length
      ? await supabase.from("diretorio_usuarios").select("user_id, nome").in("user_id", idsOutros)
      : { data: [] };

    const mapaNomes = {};
    (pessoasData || []).forEach((p) => {
      mapaNomes[p.user_id] = p.nome;
    });

    const contagemParticipantes = {};
    (participantesData || []).forEach((p) => {
      contagemParticipantes[p.conversa_id] = (contagemParticipantes[p.conversa_id] || 0) + 1;
    });

    const lista = (conversasData || []).map((c) => {
      const outros = (participantesData || []).filter((p) => p.conversa_id === c.id && p.user_id !== userId);
      const nomes = outros.map((o) => mapaNomes[o.user_id] || "Alguém");
      return { ...c, nomeOutro: nomes.join(", ") || "Conversa", totalParticipantes: contagemParticipantes[c.id] || 0 };
    });

    setConversas(lista);
    setCarregando(false);
  }

  async function abrirSeletor() {
    setMostrarSeletor(true);
    setSelecionados([]);
    if (pessoas.length > 0) return;
    setCarregandoPessoas(true);
    const { data } = await supabase
      .from("diretorio_usuarios")
      .select("user_id, nome")
      .neq("user_id", userId)
      .order("nome", { ascending: true });
    setPessoas(data || []);
    setCarregandoPessoas(false);
  }

  function alternarSelecionado(idPessoa) {
    setSelecionados((atual) => (atual.includes(idPessoa) ? atual.filter((id) => id !== idPessoa) : [...atual, idPessoa]));
  }

  async function confirmarNovaConversa() {
    if (selecionados.length === 0) return;
    setMostrarSeletor(false);
    setErro("");

    if (selecionados.length === 1) {
      const idOutro = selecionados[0];
      const pessoa = pessoas.find((p) => p.user_id === idOutro);

      const { data: minhas } = await supabase
        .from("conversas_reais_participantes")
        .select("conversa_id")
        .eq("user_id", userId);
      const meusIds = (minhas || []).map((p) => p.conversa_id);

      if (meusIds.length > 0) {
        const { data: emComum } = await supabase
          .from("conversas_reais_participantes")
          .select("conversa_id")
          .eq("user_id", idOutro)
          .in("conversa_id", meusIds);
        if (emComum && emComum.length > 0) {
          await carregarConversas();
          setSelecionados([]);
          abrirConversa({ id: emComum[0].conversa_id, nomeOutro: pessoa?.nome || "Conversa", totalParticipantes: 2 });
          return;
        }
      }
    }

    const novoId = crypto.randomUUID();

    const { error: erroConversa } = await supabase.from("conversas_reais").insert({ id: novoId });
    if (erroConversa) {
      console.error("[conversas_reais] erro ao criar conversa:", erroConversa.message);
      setErro(`Não deu pra iniciar a conversa (${erroConversa.code || "?"}: ${erroConversa.message}).`);
      return;
    }

    const { error: erroEu } = await supabase
      .from("conversas_reais_participantes")
      .insert({ conversa_id: novoId, user_id: userId });
    if (erroEu) {
      console.error("[conversas_reais] erro ao entrar na própria conversa:", erroEu.message);
      setErro(`Não deu pra iniciar a conversa (${erroEu.code || "?"}: ${erroEu.message}).`);
      return;
    }

    for (const idPessoa of selecionados) {
      const { error: erroOutro } = await supabase
        .from("conversas_reais_participantes")
        .insert({ conversa_id: novoId, user_id: idPessoa });
      if (erroOutro) {
        console.error("[conversas_reais] erro ao adicionar participante:", erroOutro.message);
        setErro(`A conversa foi criada, mas não deu pra adicionar todo mundo (${erroOutro.code || "?"}: ${erroOutro.message}).`);
      }
    }

    const nomes = pessoas.filter((p) => selecionados.includes(p.user_id)).map((p) => p.nome);
    await carregarConversas();
    setSelecionados([]);
    abrirConversa({ id: novoId, nomeOutro: nomes.join(", ") || "Conversa", totalParticipantes: selecionados.length + 1 });
  }

  async function abrirConversa(conversa) {
    if (abertaId === conversa.id) {
      setAbertaId(null);
      return;
    }
    setAbertaId(conversa.id);
    setCarregandoMensagens(true);

    const precisaNomes = !nomesPorConversa[conversa.id];
    const [{ data: msgs }, participantesResult] = await Promise.all([
      supabase.from("mensagens_reais").select("*").eq("conversa_id", conversa.id).order("criado_em", { ascending: true }),
      precisaNomes
        ? supabase.from("conversas_reais_participantes").select("user_id").eq("conversa_id", conversa.id)
        : Promise.resolve({ data: null }),
    ]);

    setMensagens(msgs || []);

    if (precisaNomes && participantesResult.data) {
      const ids = participantesResult.data.map((p) => p.user_id);
      const { data: pessoasData } = await supabase.from("diretorio_usuarios").select("user_id, nome").in("user_id", ids);
      const mapa = {};
      (pessoasData || []).forEach((p) => {
        mapa[p.user_id] = p.nome;
      });
      setNomesPorConversa((atual) => ({ ...atual, [conversa.id]: mapa }));
    }

    setCarregandoMensagens(false);
  }

  useEffect(() => {
    if (!abertaId) return;
    const canal = supabase
      .channel(`mensagens_reais_${abertaId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mensagens_reais", filter: `conversa_id=eq.${abertaId}` },
        (payload) => {
          setMensagens((atual) => (atual.some((m) => m.id === payload.new.id) ? atual : [...atual, payload.new]));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abertaId]);

  async function enviar() {
    const texto = rascunho.trim();
    if (!texto || enviando || !abertaId) return;
    setEnviando(true);
    setErro("");

    const { data: nova, error } = await supabase
      .from("mensagens_reais")
      .insert({ conversa_id: abertaId, remetente_id: userId, texto })
      .select()
      .single();

    if (error) {
      console.error("[conversas_reais] erro ao enviar mensagem:", error.message);
      setErro(`Não deu pra enviar essa mensagem (${error.code || "?"}: ${error.message}).`);
    } else if (nova) {
      setMensagens((atual) => (atual.some((m) => m.id === nova.id) ? atual : [...atual, nova]));
      const agora = new Date().toISOString();
      await supabase.from("conversas_reais").update({ ultima_mensagem_em: agora }).eq("id", abertaId);
      setConversas((atual) =>
        [...atual.map((c) => (c.id === abertaId ? { ...c, ultima_mensagem_em: agora } : c))].sort(
          (a, b) => new Date(b.ultima_mensagem_em) - new Date(a.ultima_mensagem_em)
        )
      );
      setRascunho("");
    }
    setEnviando(false);
  }

  function adicionarEmoji(emoji) {
    setRascunho((atual) => atual + emoji);
  }

  const pessoasFiltradas = pessoas.filter((p) => (p.nome || "").toLowerCase().includes(buscaPessoa.toLowerCase()));

  return (
    <div className="mb-6">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs text-muted">{texto(textos, "conversas_reais_titulo")}</p>
        <button onClick={abrirSeletor} className="flex items-center gap-1 text-xs text-ink">
          <Plus size={14} /> {texto(textos, "conversas_reais_botao_nova")}
        </button>
      </div>

      {erro && <p className="mb-2 text-xs text-rust">{erro}</p>}

      {mostrarSeletor && (
        <div className="mb-3 rounded-sm border border-border bg-surface p-3">
          <div className="mb-2 flex items-center gap-2">
            <Search size={14} className="shrink-0 text-muted" />
            <input
              value={buscaPessoa}
              onChange={(e) => setBuscaPessoa(e.target.value)}
              placeholder="Buscar pessoa..."
              className="field-input"
              autoFocus
            />
          </div>

          {carregandoPessoas ? (
            <p className="text-sm text-muted">Carregando...</p>
          ) : pessoasFiltradas.length === 0 ? (
            <p className="text-sm text-muted">Nenhuma pessoa encontrada.</p>
          ) : (
            <div className="flex max-h-56 flex-col gap-0.5 overflow-y-auto">
              {pessoasFiltradas.map((p) => (
                <label
                  key={p.user_id}
                  className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-ink hover:bg-surface2"
                >
                  <input
                    type="checkbox"
                    checked={selecionados.includes(p.user_id)}
                    onChange={() => alternarSelecionado(p.user_id)}
                  />
                  {p.nome || "Sem nome"}
                </label>
              ))}
            </div>
          )}

          <div className="mt-2 flex gap-2">
            <button onClick={() => setMostrarSeletor(false)} className="btn-secondary flex-1 text-xs">
              Cancelar
            </button>
            <button
              onClick={confirmarNovaConversa}
              disabled={selecionados.length === 0}
              className="btn-primary flex-1 text-xs disabled:opacity-50"
            >
              Iniciar conversa
            </button>
          </div>
        </div>
      )}

      {carregando ? (
        <p className="text-sm text-muted">Carregando conversas...</p>
      ) : conversas.length === 0 ? (
        <p className="text-sm text-muted">{texto(textos, "conversas_reais_vazio")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {conversas.map((c) => (
            <div key={c.id} className="rounded-sm border border-border bg-surface p-3">
              <button onClick={() => abrirConversa(c)} className="flex w-full items-center gap-2.5 text-left">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber/20 text-ink">
                  {c.totalParticipantes > 2 ? <Users size={16} /> : <MessageCircle size={16} />}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">{c.nomeOutro}</p>
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
                    {carregandoMensagens ? (
                      <p className="text-sm text-muted">Carregando...</p>
                    ) : mensagens.length === 0 ? (
                      <p className="text-sm text-muted">Nenhuma mensagem ainda. Escreva a primeira!</p>
                    ) : (
                      <div className="flex flex-col gap-1.5">
                        {mensagens.map((m) => {
                          const souEu = m.remetente_id === userId;
                          const nomes = nomesPorConversa[c.id] || {};
                          const ehGrupo = c.totalParticipantes > 2;
                          return (
                            <div key={m.id} className={`flex ${souEu ? "justify-end" : "justify-start"}`}>
                              <div
                                className={`max-w-[75%] rounded-sm px-2.5 py-1.5 text-sm ${
                                  souEu ? "bg-amber/30 text-ink" : "bg-surface2 text-ink"
                                }`}
                              >
                                {!souEu && ehGrupo && (
                                  <p className="mb-0.5 text-[10px] font-medium text-muted">
                                    {nomes[m.remetente_id] || "Alguém"}
                                  </p>
                                )}
                                {m.texto}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

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
                      onKeyDown={(e) => e.key === "Enter" && enviar()}
                      placeholder="Escreva uma mensagem..."
                      className="field-input"
                    />
                    <button onClick={enviar} disabled={enviando || !rascunho.trim()} className="btn-primary shrink-0 px-3">
                      <Send size={15} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
