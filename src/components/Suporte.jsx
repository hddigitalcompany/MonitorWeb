"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Send, ArrowLeft } from "lucide-react";
import CancelamentoCompra from "@/components/CancelamentoCompra";
import StatusReembolso from "@/components/StatusReembolso";

export default function Suporte({
  chamadosIniciais,
  userId,
  ajudaRapidaIniciais = [],
  nomeUsuario = "você",
  pedidoReembolsoInicial = null,
}) {
  const [chamados, setChamados] = useState(
    chamadosIniciais.map((c) => ({
      ...c,
      mensagens: (c.mensagens_suporte || []).sort(
        (a, b) => new Date(a.criado_em) - new Date(b.criado_em)
      ),
    }))
  );
  const [chamadoAbertoId, setChamadoAbertoId] = useState(null);
  const [etapa, setEtapa] = useState(ajudaRapidaIniciais.length > 0 ? "categorias" : "formulario");
  const [categoriaEscolhida, setCategoriaEscolhida] = useState(null);
  const [assunto, setAssunto] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [resposta, setResposta] = useState("");
  const [erro, setErro] = useState("");
  const [cancelamentoAberto, setCancelamentoAberto] = useState(false);
  const [pedidoReembolso, setPedidoReembolso] = useState(pedidoReembolsoInicial);
  const supabase = createClient();

  const chamadoAberto = chamados.find((c) => c.id === chamadoAbertoId);

  function irParaFormulario(assuntoInicial) {
    if (assuntoInicial) setAssunto(assuntoInicial);
    setEtapa("formulario");
  }

  function voltarParaCategorias() {
    setEtapa("categorias");
    setCategoriaEscolhida(null);
  }

  async function enviarChamado() {
    if (!assunto.trim() || !mensagem.trim()) {
      setErro("Preencha assunto e mensagem.");
      return;
    }
    setErro("");

    const { data: novoChamado, error } = await supabase
      .from("chamados_suporte")
      .insert({ user_id: userId, assunto: assunto.trim() })
      .select()
      .single();

    if (error || !novoChamado) return;

    const { data: novaMsg } = await supabase
      .from("mensagens_suporte")
      .insert({ chamado_id: novoChamado.id, remetente: "usuario", texto: mensagem.trim() })
      .select()
      .single();

    setChamados([{ ...novoChamado, mensagens: novaMsg ? [novaMsg] : [] }, ...chamados]);
    setAssunto("");
    setMensagem("");
    setEtapa(ajudaRapidaIniciais.length > 0 ? "categorias" : "formulario");
    setCategoriaEscolhida(null);
  }

  async function enviarResposta() {
    if (!resposta.trim() || !chamadoAberto) return;
    const { data: novaMsg } = await supabase
      .from("mensagens_suporte")
      .insert({ chamado_id: chamadoAberto.id, remetente: "usuario", texto: resposta.trim() })
      .select()
      .single();

    if (novaMsg) {
      setChamados(
        chamados.map((c) =>
          c.id === chamadoAberto.id ? { ...c, mensagens: [...c.mensagens, novaMsg] } : c
        )
      );
      setResposta("");
    }
  }

  if (cancelamentoAberto) {
    return (
      <CancelamentoCompra
        userId={userId}
        nomeUsuario={nomeUsuario}
        onFechar={() => setCancelamentoAberto(false)}
        onConcluido={(novoPedido) => {
          setPedidoReembolso(novoPedido);
          setCancelamentoAberto(false);
        }}
      />
    );
  }

  if (chamadoAberto) {
    return (
      <div>
        <button
          onClick={() => setChamadoAbertoId(null)}
          className="mb-4 flex items-center gap-1.5 text-sm text-muted"
        >
          <ArrowLeft size={15} /> Voltar
        </button>
        <p className="mb-1 font-serif text-lg text-ink">{chamadoAberto.assunto}</p>
        <p
          className={`mb-4 text-xs ${chamadoAberto.status === "respondido" ? "text-olive" : "text-amber"}`}
        >
          {chamadoAberto.status === "respondido" ? "Respondido" : "Aberto"}
        </p>

        <div className="mb-4 flex flex-col gap-2.5">
          {chamadoAberto.mensagens.map((m) => (
            <div key={m.id} className={`flex ${m.remetente === "usuario" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] rounded-sm px-3 py-2 text-sm leading-relaxed ${
                  m.remetente === "usuario"
                    ? "bg-amber text-ink"
                    : "border border-border bg-surface text-ink"
                }`}
              >
                {m.texto}
              </div>
            </div>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            value={resposta}
            onChange={(e) => setResposta(e.target.value)}
            placeholder="Escreva uma mensagem"
            className="field-input"
            onKeyDown={(e) => e.key === "Enter" && enviarResposta()}
          />
          <button onClick={enviarResposta} aria-label="Enviar" className="btn-primary shrink-0 px-3">
            <Send size={15} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      {etapa === "categorias" && (
        <div className="card mb-6">
          <p className="mb-1 text-sm text-ink">Como podemos ajudar?</p>
          <p className="mb-3 text-xs text-muted">Escolhe o que mais parece com sua dúvida.</p>
          <div className="flex flex-col gap-2">
            {ajudaRapidaIniciais.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCategoriaEscolhida(item);
                  setEtapa("resposta");
                }}
                className="rounded-sm border border-border bg-surface p-3 text-left text-sm text-ink"
              >
                {item.pergunta}
              </button>
            ))}
          </div>
          <button onClick={() => irParaFormulario()} className="mt-3 text-xs text-muted underline">
            Prefiro falar direto com o suporte
          </button>
        </div>
      )}

      {etapa === "resposta" && categoriaEscolhida && (
        <div className="card mb-6">
          <button onClick={voltarParaCategorias} className="mb-3 flex items-center gap-1.5 text-xs text-muted">
            <ArrowLeft size={13} /> Voltar
          </button>
          <p className="mb-1 text-sm text-ink">{categoriaEscolhida.pergunta}</p>
          <p className="mb-4 text-sm leading-relaxed text-muted">{categoriaEscolhida.resposta}</p>
          <p className="mb-2 text-xs text-muted">Isso resolveu?</p>
          <div className="flex gap-2">
            <button
              onClick={voltarParaCategorias}
              className="flex-1 rounded-sm border border-olive px-3 py-2 text-sm text-olive"
            >
              Resolveu, obrigado!
            </button>
            <button
              onClick={() => irParaFormulario(categoriaEscolhida.pergunta)}
              className="flex-1 rounded-sm border border-border px-3 py-2 text-sm text-ink"
            >
              Ainda preciso de ajuda
            </button>
          </div>
        </div>
      )}

      {etapa === "formulario" && (
        <div className="card mb-6">
          {ajudaRapidaIniciais.length > 0 && (
            <button onClick={voltarParaCategorias} className="mb-3 flex items-center gap-1.5 text-xs text-muted">
              <ArrowLeft size={13} /> Voltar
            </button>
          )}
          <p className="field-label">Assunto</p>
          <input
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
            placeholder="Resumo do que você precisa"
            className="field-input mb-3"
          />
          <p className="field-label">Mensagem</p>
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Conte com mais detalhes"
            rows={3}
            className="field-input mb-1 resize-none"
          />
          {erro && <p className="mb-2 text-xs text-rust">{erro}</p>}
          <button onClick={enviarChamado} className="btn-primary mt-2 w-full">
            Enviar chamado
          </button>
        </div>
      )}

      {pedidoReembolso ? (
        <StatusReembolso pedido={pedidoReembolso} nomeUsuario={nomeUsuario} />
      ) : (
        <div className="card mb-6">
          <button
            onClick={() => setCancelamentoAberto(true)}
            className="w-full rounded-sm border border-rust px-3 py-2 text-center text-sm text-rust"
          >
            Cancelar minha compra
          </button>
        </div>
      )}

      <p className="mb-2 text-xs text-muted">Seus chamados</p>
      {chamados.length === 0 ? (
        <p className="text-sm text-muted">Nenhum chamado enviado ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {chamados.map((c) => (
            <button
              key={c.id}
              onClick={() => setChamadoAbertoId(c.id)}
              className="w-full rounded-sm border border-border bg-surface p-3 text-left"
            >
              <div className="mb-1 flex items-start justify-between gap-2">
                <p className="text-sm text-ink">{c.assunto}</p>
                <span
                  className={`shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] ${
                    c.status === "respondido" ? "border-olive text-olive" : "border-amber text-amber"
                  }`}
                >
                  {c.status === "respondido" ? "Respondido" : "Aberto"}
                </span>
              </div>
              <p className="truncate text-xs text-muted">
                {c.mensagens[c.mensagens.length - 1]?.texto}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
