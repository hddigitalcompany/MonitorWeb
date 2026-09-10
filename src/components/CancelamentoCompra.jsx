"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ArrowLeft, Send } from "lucide-react";

const FILLERS_HESITACAO = ["entao", "bem", "assim", "tipo", "olha", "so um instante"];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function entre(min, max) {
  return min + Math.random() * (max - min);
}

function Bolha({ de, texto, destaque = false }) {
  const propria = de === "usuario";
  return (
    <div className={`flex ${propria ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-sm px-3 py-2 text-sm leading-relaxed ${
          propria
            ? "bg-amber text-ink"
            : destaque
            ? "border border-olive bg-olive/10 text-ink"
            : "border border-border bg-surface text-ink"
        }`}
      >
        {texto}
        {!propria && texto === "" && <span className="opacity-0">.</span>}
      </div>
    </div>
  );
}

function BolhaDigitando() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-sm border border-border bg-surface px-3 py-2.5">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.3s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted [animation-delay:-0.15s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted" />
      </div>
    </div>
  );
}

export default function CancelamentoCompra({ userId, nomeUsuario, onConcluido, onFechar }) {
  const [mensagens, setMensagens] = useState([]);
  const [digitando, setDigitando] = useState(false);
  const [emDigitacao, setEmDigitacao] = useState(null); // { texto, destaque } enquanto a mensagem está sendo "escrita"
  const [etapa, setEtapa] = useState("inicio");
  const [composerValor, setComposerValor] = useState("");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");
  const contadorId = useRef(0);
  const fimRef = useRef(null);
  const supabase = createClient();

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens, digitando, emDigitacao, etapa]);

  function proximoId() {
    contadorId.current += 1;
    return contadorId.current;
  }

  function falarUsuario(texto) {
    if (!texto || !texto.trim()) return;
    setMensagens((atuais) => [...atuais, { id: proximoId(), de: "usuario", texto: texto.trim() }]);
  }

  // Efeito de "digitar de verdade": a mensagem vai aparecendo letra por
  // letra e, de vez em quando, ela escreve um comecinho de palavra e apaga
  // antes de continuar — pra não parecer um texto que só surge na tela.
  async function digitarTexto(textoCompleto, destaque) {
    setEmDigitacao({ texto: "", destaque });

    const vaiHesitar = textoCompleto.length > 40 && Math.random() < 0.45;
    const pontoHesitacao = vaiHesitar
      ? Math.floor(textoCompleto.length * entre(0.3, 0.65))
      : -1;

    let atual = "";
    for (let i = 0; i < textoCompleto.length; i++) {
      atual += textoCompleto[i];
      setEmDigitacao({ texto: atual, destaque });
      await sleep(entre(22, 42));

      if (i === pontoHesitacao) {
        const rabisco = FILLERS_HESITACAO[Math.floor(Math.random() * FILLERS_HESITACAO.length)];
        let comHesitacao = atual + " " + rabisco;
        setEmDigitacao({ texto: comHesitacao, destaque });
        await sleep(entre(350, 600));
        while (comHesitacao.length > atual.length) {
          comHesitacao = comHesitacao.slice(0, -1);
          setEmDigitacao({ texto: comHesitacao, destaque });
          await sleep(entre(30, 55));
        }
        await sleep(entre(200, 400));
      }
    }

    setMensagens((prev) => [...prev, { id: proximoId(), de: "bot", texto: textoCompleto, destaque }]);
    setEmDigitacao(null);
  }

  async function falarBot(texto, { destaque = false } = {}) {
    setDigitando(true);
    await sleep(entre(700, 1400));
    setDigitando(false);
    await digitarTexto(texto, destaque);
    await sleep(entre(500, 1100));
  }

  // Pausa "buscando informação" — sem nova mensagem, só o indicador
  // ativo por mais tempo, pra dar a sensação de análise de verdade.
  async function pausaBuscando() {
    setDigitando(true);
    await sleep(entre(3200, 5000));
    setDigitando(false);
  }

  useEffect(() => {
    (async () => {
      await falarBot(
        "Ao continuar, sua compra será cancelada e o acesso ao aplicativo será encerrado. O valor pago entra em análise: se a sua compra estiver dentro de 7 dias, você recebe o valor integral de volta."
      );
      setEtapa("aguardando_confirmacao");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function bloqueado() {
    return digitando || emDigitacao !== null;
  }

  async function escolherDesistir() {
    falarUsuario("Desistir");
    setEtapa("encerrado");
    setTimeout(onFechar, 500);
  }

  async function avancarConfirmacao(textoBolha) {
    falarUsuario(textoBolha);
    setComposerValor("");
    setEtapa("processando");
    await falarBot("Antes de continuar, conta pra gente o que deixou você insatisfeita:");
    setEtapa("aguardando_motivo");
  }

  async function avancarMotivo(textoBolha) {
    falarUsuario(textoBolha);
    setMotivo(textoBolha);
    setComposerValor("");
    setEtapa("processando");

    await falarBot(
      `Olá, ${nomeUsuario} tudo bem? Me chamo Julia, e faço parte do atendimento e central de contas, recebemos sua insatisfação e seu desejo de cancelar a conta.`
    );
    await falarBot("Se confirmar vou dar continuidade na solicitação de reembolso do seu pedido, está de acordo?");
    setEtapa("aguardando_agente");
  }

  async function agenteCancelar() {
    falarUsuario("Cancelar");
    setEtapa("encerrado");
    setTimeout(onFechar, 500);
  }

  async function avancarAgente(textoBolha) {
    falarUsuario(textoBolha);
    setComposerValor("");
    setEtapa("processando");
    await falarBot("Verificando sua compra...");
    await pausaBuscando();
    await falarBot(
      "Verifiquei e ressaltamos que sua compra está dentro do prazo e elegível para reembolso, conforme você me pediu eu vou dar prosseguimento no seu pedido e farei o cancelamento...",
      { destaque: true }
    );
    await falarBot(
      `O pedido vai para análise ${nomeUsuario}, tudo bem? Essa análise leva no máximo 4 dias, e após isso você poderá acompanhar por aqui o pedido de reembolso.`,
      { destaque: true }
    );
    setEtapa("aguardando_confirmacao_final");
  }

  async function avancarEnvio(textoBolha) {
    falarUsuario(textoBolha);
    setComposerValor("");
    setErro("");
    setEtapa("processando");
    await falarBot("Enviando pedido...");

    const { data: novo, error } = await supabase
      .from("pedidos_reembolso")
      .insert({ user_id: userId, motivo: motivo.trim() })
      .select()
      .single();

    if (error || !novo) {
      await falarBot("Não deu pra enviar o pedido agora. Tenta de novo em instantes.");
      setErro("Não deu pra enviar o pedido agora. Tenta de novo em instantes.");
      setEtapa("aguardando_confirmacao_final");
      return;
    }

    await falarBot("Pedido de reembolso efetuado com sucesso!", { destaque: true });
    await falarBot("Em análise, acompanhe por aqui cada etapa.", { destaque: true });
    setEtapa("concluido");
    setTimeout(() => onConcluido(novo), 900);
  }

  function enviarComposer() {
    const texto = composerValor.trim();
    if (!texto || bloqueado()) return;
    if (etapa === "aguardando_confirmacao") avancarConfirmacao(texto);
    else if (etapa === "aguardando_motivo") avancarMotivo(texto);
    else if (etapa === "aguardando_agente") avancarAgente(texto);
    else if (etapa === "aguardando_confirmacao_final") avancarEnvio(texto);
  }

  const placeholdersComposer = {
    aguardando_confirmacao: "Escreva algo ou toque em continuar",
    aguardando_motivo: "Conte com detalhes o que aconteceu",
    aguardando_agente: "Escreva algo ou toque em continuar",
    aguardando_confirmacao_final: "Escreva algo pra confirmar",
  };

  const mostraComposer = Object.prototype.hasOwnProperty.call(placeholdersComposer, etapa);

  return (
    <div>
      <button onClick={onFechar} className="mb-4 flex items-center gap-1.5 text-sm text-muted">
        <ArrowLeft size={15} /> Voltar
      </button>

      <div className="mb-4 flex flex-col gap-2.5">
        {mensagens.map((m) => (
          <Bolha key={m.id} de={m.de} texto={m.texto} destaque={m.destaque} />
        ))}
        {emDigitacao && <Bolha de="bot" texto={emDigitacao.texto} destaque={emDigitacao.destaque} />}
        {digitando && !emDigitacao && <BolhaDigitando />}
        <div ref={fimRef} />
      </div>

      {etapa === "aguardando_confirmacao" && (
        <div className="mb-2 flex gap-2">
          <button
            onClick={escolherDesistir}
            disabled={bloqueado()}
            className="flex-1 rounded-sm border border-border px-3 py-2 text-sm text-ink disabled:opacity-50"
          >
            Desistir
          </button>
          <button
            onClick={() => avancarConfirmacao("Continuar o cancelamento")}
            disabled={bloqueado()}
            className="flex-1 rounded-sm border border-rust px-3 py-2 text-sm text-rust disabled:opacity-50"
          >
            Continuar o cancelamento
          </button>
        </div>
      )}

      {etapa === "aguardando_agente" && (
        <div className="mb-2 flex gap-2">
          <button
            onClick={agenteCancelar}
            disabled={bloqueado()}
            className="flex-1 rounded-sm border border-border px-3 py-2 text-sm text-ink disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => avancarAgente("Continuar")}
            disabled={bloqueado()}
            className="flex-1 btn-primary disabled:opacity-50"
          >
            Continuar
          </button>
        </div>
      )}

      {etapa === "aguardando_confirmacao_final" && (
        <div className="mb-2">
          {erro && <p className="mb-2 text-xs text-rust">{erro}</p>}
          <button
            onClick={() => avancarEnvio("Sim, pode confirmar")}
            disabled={bloqueado()}
            className="btn-primary w-full disabled:opacity-50"
          >
            Sim, pode confirmar
          </button>
        </div>
      )}

      {mostraComposer && (
        <div className="flex gap-2">
          <input
            value={composerValor}
            onChange={(e) => setComposerValor(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && enviarComposer()}
            placeholder={placeholdersComposer[etapa]}
            disabled={bloqueado()}
            className="field-input disabled:opacity-50"
          />
          <button
            onClick={enviarComposer}
            aria-label="Enviar"
            disabled={bloqueado() || !composerValor.trim()}
            className="btn-primary shrink-0 px-3 disabled:opacity-50"
          >
            <Send size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
