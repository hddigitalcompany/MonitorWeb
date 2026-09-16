"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Trash2,
  Upload,
  Send,
  ArrowLeft,
  Pencil,
  Home,
  Image as ImageIcon,
  MapPin,
  Phone,
  Search,
  Wifi,
  BookUser,
  Headset,
  MessageCircle,
  Users,
  CreditCard,
  LogIn,
  ChevronDown,
} from "lucide-react";
import { extrairIdYoutube } from "@/lib/youtube";
import { TEXTOS_PADRAO } from "@/lib/textos";
import { calcularEtapaReembolso } from "@/lib/reembolso";
import { formatarHora, tempoRelativo } from "@/lib/tempo";
import { formatarTelefone } from "@/lib/telefone";
import { parseWhatsAppTxt, remetentesUnicos } from "@/lib/whatsapp";
import ConversaBolhas from "@/components/ConversaBolhas";
import { ABAS } from "@/components/DashboardChrome";
import PainelAoVivo from "@/components/admin/PainelAoVivo";

const ROTAS_PREVIEW = [
  { href: "/", label: "Login / criar conta" },
  { href: "/dashboard/inicio", label: "Início" },
  ...ABAS.filter((a) => a.href !== "/dashboard/inicio"),
];

const SECOES = [
  { id: "painel", label: "Painel ao vivo" },
  { id: "video", label: "Vídeo do dia" },
  { id: "video_conversas", label: "Vídeo (Conversas)" },
  { id: "fotos", label: "Fotos" },
  { id: "locais", label: "Locais seguros" },
  { id: "lembretes", label: "Lembretes" },
  { id: "links", label: "Links de ajuda" },
  { id: "wifi", label: "Wifi" },
  { id: "contatos", label: "Contatos úteis" },
  { id: "ajuda", label: "Ajuda rápida" },
  { id: "suporte", label: "Suporte" },
  { id: "conversas_demo", label: "Conversas (exemplo)" },
  { id: "clientes", label: "Clientes" },
  { id: "reembolsos", label: "Reembolsos" },
  { id: "textos", label: "Textos" },
];

export default function AdminDashboard({ dadosIniciais }) {
  const [secao, setSecao] = useState("painel");
  const [previewRota, setPreviewRota] = useState("/dashboard/inicio");
  const [previewKey, setPreviewKey] = useState(0);

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <div className="mx-auto w-full max-w-2xl flex-1 px-5 py-8">
        <p className="mb-1 font-extrabold tracking-tight text-2xl text-ink">Administração</p>
        <p className="mb-6 text-sm text-muted">Publique conteúdo e responda chamados de suporte.</p>

        <div className="mb-6 flex flex-wrap gap-1.5 border-b border-border pb-4">
          {SECOES.map((s) => (
            <button
              key={s.id}
              onClick={() => setSecao(s.id)}
              className={`rounded-sm px-3 py-1.5 text-xs ${
                secao === s.id ? "bg-amber text-ink" : "border border-border text-muted"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {secao === "painel" && (
          <PainelAoVivo
            eventosIniciais={dadosIniciais.eventosVisita}
            clientes={dadosIniciais.clientes}
            idsAdmins={dadosIniciais.idsAdmins}
            erroContas={dadosIniciais.erroClientes}
          />
        )}
        {secao === "video" && <SecaoVideo itens={dadosIniciais.videos} />}
        {secao === "video_conversas" && (
          <SecaoVideo
            itens={dadosIniciais.videosConversas}
            tabela="conteudo_video_conversas"
            pastaStorage="video-conversas"
            rotuloRecente="O mais recente é o que aparece na aba Conversas."
          />
        )}
        {secao === "fotos" && <SecaoFotos itens={dadosIniciais.fotos} />}
        {secao === "locais" && (
          <SecaoTexto tabela="conteudo_locais" itens={dadosIniciais.locais} placeholder="Sugestão de local seguro" />
        )}
        {secao === "lembretes" && <SecaoLembretes itens={dadosIniciais.lembretes} />}
        {secao === "links" && <SecaoLinks itens={dadosIniciais.links} />}
        {secao === "wifi" && <SecaoWifi itens={dadosIniciais.wifiDicas} />}
        {secao === "contatos" && <SecaoContatos itens={dadosIniciais.contatos} />}
        {secao === "ajuda" && <SecaoAjudaRapida itens={dadosIniciais.ajudaRapida} />}
        {secao === "suporte" && <SecaoSuporte chamadosIniciais={dadosIniciais.chamados} />}
        {secao === "conversas_demo" && <SecaoConversasDemo itens={dadosIniciais.conversasDemo} />}
        {secao === "clientes" && (
          <SecaoClientes itens={dadosIniciais.clientes} erroConfig={dadosIniciais.erroClientes} />
        )}
        {secao === "reembolsos" && (
          <SecaoReembolsos itens={dadosIniciais.reembolsos} erroConfig={dadosIniciais.erroClientes} />
        )}
        {secao === "textos" && <SecaoTextos itens={dadosIniciais.textos} />}
      </div>

      <div className="hidden shrink-0 flex-col items-center gap-3 border-l border-border bg-surface2 px-6 py-8 lg:flex">
        <p className="text-xs text-muted">Prévia ao vivo (como o app está agora)</p>
        <div className="flex items-center gap-2">
          <select
            value={previewRota}
            onChange={(e) => setPreviewRota(e.target.value)}
            className="field-input py-1.5 text-xs"
          >
            {ROTAS_PREVIEW.map(({ href, label }) => (
              <option key={href} value={href}>
                {label}
              </option>
            ))}
          </select>
          <button
            onClick={() => setPreviewKey((k) => k + 1)}
            className="btn-secondary shrink-0 px-3 py-1.5 text-xs"
          >
            Atualizar
          </button>
        </div>
        <div
          className="overflow-hidden rounded-[2rem] border-4 border-ink bg-surface shadow-lg"
          style={{ width: 380, height: 780 }}
        >
          <iframe key={previewKey} src={previewRota} title="Prévia do app" className="h-full w-full border-0" />
        </div>
      </div>
    </div>
  );
}

function SecaoVideo({
  itens: itensIniciais,
  tabela = "conteudo_video_dia",
  pastaStorage = "video-dia",
  rotuloRecente = "O mais recente é o que aparece na Início.",
}) {
  const [itens, setItens] = useState(itensIniciais);
  const [legenda, setLegenda] = useState("");
  const [linkYoutube, setLinkYoutube] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const supabase = createClient();

  async function enviar(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setErro("");
    setEnviando(true);
    const caminho = `${pastaStorage}/${Date.now()}-${arquivo.name}`;
    const { error } = await supabase.storage.from("conteudo").upload(caminho, arquivo);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("conteudo").getPublicUrl(caminho);
      const { data: novo } = await supabase
        .from(tabela)
        .insert({ url: publicUrl, caminho, legenda, tipo: "upload" })
        .select()
        .single();
      if (novo) setItens([novo, ...itens]);
      setLegenda("");
    } else {
      setErro("Não deu pra subir esse arquivo (talvez seja grande demais). Tente colar um link do YouTube em vez de subir o arquivo.");
    }
    setEnviando(false);
    e.target.value = "";
  }

  async function adicionarYoutube() {
    setErro("");
    const id = extrairIdYoutube(linkYoutube.trim());
    if (!id) {
      setErro("Esse link do YouTube não parece válido. Cole o link completo (ex: https://www.youtube.com/watch?v=... ou https://youtu.be/...).");
      return;
    }
    setEnviando(true);
    const { data: novo, error } = await supabase
      .from(tabela)
      .insert({ url: `https://www.youtube.com/watch?v=${id}`, caminho: null, legenda, tipo: "youtube" })
      .select()
      .single();
    if (!error && novo) {
      setItens([novo, ...itens]);
      setLegenda("");
      setLinkYoutube("");
    } else if (error) {
      setErro("Não deu pra salvar o link. Tente de novo.");
    }
    setEnviando(false);
  }

  async function excluir(item) {
    if (item.tipo !== "youtube" && item.caminho) {
      await supabase.storage.from("conteudo").remove([item.caminho]);
    }
    await supabase.from(tabela).delete().eq("id", item.id);
    setItens(itens.filter((i) => i.id !== item.id));
  }

  return (
    <div>
      <div className="card mb-6">
        <p className="field-label">Legenda</p>
        <input value={legenda} onChange={(e) => setLegenda(e.target.value)} className="field-input mb-3" placeholder="Um novo dia, uma nova chance..." />

        <label className="btn-primary mb-3 block cursor-pointer text-center">
          {enviando ? "Enviando..." : "Subir vídeo (.mp4)"}
          <input type="file" accept="video/*" onChange={enviar} disabled={enviando} className="hidden" />
        </label>

        <p className="mb-2 text-center text-xs text-muted">ou</p>

        <p className="field-label">Link do YouTube</p>
        <div className="flex gap-2">
          <input
            value={linkYoutube}
            onChange={(e) => setLinkYoutube(e.target.value)}
            className="field-input"
            placeholder="https://www.youtube.com/watch?v=..."
          />
          <button onClick={adicionarYoutube} disabled={enviando || !linkYoutube.trim()} className="btn-primary shrink-0 px-3">
            Adicionar
          </button>
        </div>
        <p className="mt-1 text-xs text-muted">
          Sem limite de tamanho — use pra vídeos longos.
        </p>

        {erro && <p className="mt-3 text-xs text-rust">{erro}</p>}
      </div>
      <p className="mb-2 text-xs text-muted">{rotuloRecente}</p>
      <div className="flex flex-col gap-2">
        {itens.map((v) => (
          <div key={v.id} className="flex items-center justify-between rounded-sm border border-border bg-surface p-2.5">
            <p className="truncate text-xs text-ink">
              {v.tipo === "youtube" ? "▶ YouTube — " : ""}
              {v.legenda || v.caminho || v.url}
            </p>
            <button onClick={() => excluir(v)} className="text-muted hover:text-rust"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecaoFotos({ itens: itensIniciais }) {
  const [itens, setItens] = useState(itensIniciais);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState({ feito: 0, total: 0 });
  const supabase = createClient();

  async function enviar(e) {
    const arquivos = Array.from(e.target.files || []);
    if (arquivos.length === 0) return;
    setEnviando(true);
    setProgresso({ feito: 0, total: arquivos.length });

    const novas = [];
    for (const arquivo of arquivos) {
      const caminho = `fotos/${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${arquivo.name}`;
      const { error } = await supabase.storage.from("conteudo").upload(caminho, arquivo);
      if (!error) {
        const { data: { publicUrl } } = supabase.storage.from("conteudo").getPublicUrl(caminho);
        const { data: nova } = await supabase.from("conteudo_fotos").insert({ url: publicUrl, caminho }).select().single();
        if (nova) novas.push(nova);
      }
      setProgresso((p) => ({ ...p, feito: p.feito + 1 }));
    }

    if (novas.length > 0) setItens([...novas, ...itens]);
    setEnviando(false);
    e.target.value = "";
  }

  async function excluir(item) {
    await supabase.storage.from("conteudo").remove([item.caminho]);
    await supabase.from("conteudo_fotos").delete().eq("id", item.id);
    setItens(itens.filter((i) => i.id !== item.id));
  }

  return (
    <div>
      <label className="btn-primary mb-6 inline-flex cursor-pointer">
        <Upload size={15} />{" "}
        {enviando ? `Enviando ${progresso.feito} de ${progresso.total}...` : "Subir fotos"}
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={enviar}
          disabled={enviando}
          className="hidden"
        />
      </label>
      <div className="grid grid-cols-3 gap-2">
        {itens.map((f) => (
          <div key={f.id} className="group relative aspect-square overflow-hidden rounded-sm border border-border">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={f.url} alt="" className="h-full w-full object-cover" />
            <button onClick={() => excluir(f)} className="absolute right-1.5 top-1.5 rounded-sm bg-base/70 p-1 opacity-0 group-hover:opacity-100">
              <Trash2 size={12} className="text-ink" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecaoLembretes({ itens: itensIniciais }) {
  const [itens, setItens] = useState(itensIniciais);
  const [linha, setLinha] = useState("");
  const [lista, setLista] = useState("");
  const [enviandoLista, setEnviandoLista] = useState(false);
  const [erroLista, setErroLista] = useState("");
  const supabase = createClient();

  function ordenar(a, b) {
    if (!a.hora && !b.hora) return 0;
    if (!a.hora) return 1;
    if (!b.hora) return -1;
    return a.hora.localeCompare(b.hora);
  }

  function formatarHora(valor) {
    const limpo = (valor || "").trim();
    if (!limpo) return null;
    if (/^\d{3,4}$/.test(limpo)) {
      const minutos = limpo.slice(-2);
      const horas = limpo.slice(0, -2).padStart(2, "0");
      return `${horas}:${minutos}`;
    }
    return limpo;
  }

  function formatarHorasNoTexto(texto) {
    if (!texto) return texto;
    return texto.replace(/\b(\d{3,4})\b/g, (numero) => {
      const minutos = numero.slice(-2);
      const horas = numero.slice(0, -2).padStart(2, "0");
      return `${horas}:${minutos}`;
    });
  }

  async function adicionar() {
    const partes = linha.split(",").map((p) => p.trim());
    const [horaBruta, lembrete, ...resto] = partes;
    if (!lembrete) return;
    const hora = formatarHora(horaBruta);
    const atividade = formatarHorasNoTexto(resto.join(", ").trim());
    const { data: novo } = await supabase
      .from("conteudo_lembretes")
      .insert({ hora: hora || null, texto: lembrete, atividade: atividade || null })
      .select()
      .single();
    if (novo) setItens([...itens, novo].sort(ordenar));
    setLinha("");
  }

  async function adicionarLista() {
    setErroLista("");
    const entradas = lista
      .split(/;|\s+\.\s+/)
      .map((item) => item.trim().replace(/\.$/, "").trim())
      .filter(Boolean)
      .map((item) => {
        const [horaBruta, lembrete, ...resto] = item.split(",").map((p) => p.trim());
        if (!lembrete) return null;
        const hora = formatarHora(horaBruta);
        const atividade = formatarHorasNoTexto(resto.join(", ").trim());
        return { hora: hora || null, texto: lembrete, atividade: atividade || null };
      })
      .filter(Boolean);

    if (entradas.length === 0) {
      setErroLista("Não encontrei nenhum item válido. Use: hora, lembrete, atividade; hora, lembrete, atividade");
      return;
    }

    setEnviandoLista(true);
    const { data: novos, error } = await supabase.from("conteudo_lembretes").insert(entradas).select();
    if (!error && novos) {
      setItens([...itens, ...novos].sort(ordenar));
      setLista("");
    } else {
      setErroLista("Não deu pra salvar a lista. Tente de novo.");
    }
    setEnviandoLista(false);
  }

  function aoTeclar(e) {
    if (e.key === "Enter") adicionar();
  }

  async function excluir(id) {
    await supabase.from("conteudo_lembretes").delete().eq("id", id);
    setItens(itens.filter((i) => i.id !== id));
  }

  return (
    <div>
      <div className="card mb-6">
        <p className="field-label">Hora, lembrete, atividade</p>
        <div className="flex gap-2">
          <input
            value={linha}
            onChange={(e) => setLinha(e.target.value)}
            onKeyDown={aoTeclar}
            placeholder="0817, academia, treino de peito 8"
            className="field-input"
          />
          <button onClick={adicionar} className="btn-primary shrink-0">Publicar</button>
        </div>
        <p className="mt-1 text-xs text-muted">Separe por vírgula, nessa ordem: hora, lembrete, atividade.</p>
      </div>

      <div className="card mb-6">
        <p className="field-label">Colar lista (vários de uma vez)</p>
        <textarea
          value={lista}
          onChange={(e) => setLista(e.target.value)}
          rows={5}
          className="field-input mb-2"
          placeholder={"0817, academia, treino de peito 8; 1200, almoço, levar remédio"}
        />
        <p className="mb-3 text-xs text-muted">
          Vírgula separa hora, lembrete e atividade. Ponto e vírgula separa um item do outro.
        </p>
        <button onClick={adicionarLista} disabled={enviandoLista || !lista.trim()} className="btn-primary w-full">
          {enviandoLista ? "Publicando..." : "Publicar lista"}
        </button>
        {erroLista && <p className="mt-2 text-xs text-rust">{erroLista}</p>}
      </div>

      <div className="flex flex-col gap-2">
        {[...itens].sort(ordenar).map((i) => (
          <div key={i.id} className="flex items-center justify-between gap-2 rounded-sm border border-border bg-surface p-3">
            <div className="flex min-w-0 flex-1 items-baseline gap-2">
              {i.hora && (
                <span className="shrink-0 rounded-sm bg-amber/20 px-2 py-1 text-xs font-medium text-ink">{i.hora}</span>
              )}
              <p className="truncate text-sm font-medium text-ink">{i.texto}</p>
              {i.atividade && <p className="truncate text-xs text-muted">— {i.atividade}</p>}
            </div>
            <button onClick={() => excluir(i.id)} className="shrink-0 text-muted hover:text-rust"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecaoTexto({ tabela, itens: itensIniciais, placeholder }) {
  const [itens, setItens] = useState(itensIniciais);
  const [texto, setTexto] = useState("");
  const [lista, setLista] = useState("");
  const [enviandoLista, setEnviandoLista] = useState(false);
  const [erroLista, setErroLista] = useState("");
  const supabase = createClient();

  async function adicionar() {
    if (!texto.trim()) return;
    const { data: novo } = await supabase.from(tabela).insert({ texto: texto.trim() }).select().single();
    if (novo) setItens([novo, ...itens]);
    setTexto("");
  }

  async function adicionarLista() {
    setErroLista("");
    const entradas = lista
      .split(/;|\s+\.\s+/)
      .map((item) => item.trim().replace(/\.$/, "").trim())
      .filter(Boolean)
      .map((item) => ({ texto: item }));

    if (entradas.length === 0) {
      setErroLista("Não encontrei nenhum item válido. Separe um item do outro com ;");
      return;
    }

    setEnviandoLista(true);
    const { data: novos, error } = await supabase.from(tabela).insert(entradas).select();
    if (!error && novos) {
      setItens([...novos, ...itens]);
      setLista("");
    } else {
      setErroLista("Não deu pra salvar a lista. Tente de novo.");
    }
    setEnviandoLista(false);
  }

  async function excluir(id) {
    await supabase.from(tabela).delete().eq("id", id);
    setItens(itens.filter((i) => i.id !== id));
  }

  return (
    <div>
      <div className="mb-6 flex gap-2">
        <input value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={placeholder} className="field-input" />
        <button onClick={adicionar} className="btn-primary shrink-0">Publicar</button>
      </div>

      <div className="card mb-6">
        <p className="field-label">Colar lista (vários de uma vez)</p>
        <textarea
          value={lista}
          onChange={(e) => setLista(e.target.value)}
          rows={5}
          className="field-input mb-2"
          placeholder={`${placeholder}; outro; mais um`}
        />
        <p className="mb-3 text-xs text-muted">Separe um item do outro com ponto e vírgula.</p>
        <button onClick={adicionarLista} disabled={enviandoLista || !lista.trim()} className="btn-primary w-full">
          {enviandoLista ? "Publicando..." : "Publicar lista"}
        </button>
        {erroLista && <p className="mt-2 text-xs text-rust">{erroLista}</p>}
      </div>

      <div className="flex flex-col gap-2">
        {itens.map((i) => (
          <div key={i.id} className="flex items-start justify-between gap-2 rounded-sm border border-border bg-surface p-3">
            <p className="text-sm text-ink">{i.texto}</p>
            <button onClick={() => excluir(i.id)} className="shrink-0 text-muted hover:text-rust"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecaoLinks({ itens: itensIniciais }) {
  const [itens, setItens] = useState(itensIniciais);
  const [texto, setTexto] = useState("");
  const [url, setUrl] = useState("");
  const [lista, setLista] = useState("");
  const [enviandoLista, setEnviandoLista] = useState(false);
  const [erroLista, setErroLista] = useState("");
  const supabase = createClient();

  async function adicionar() {
    if (!texto.trim()) return;
    const { data: novo } = await supabase.from("conteudo_links").insert({ texto: texto.trim(), url: url.trim() || null }).select().single();
    if (novo) setItens([novo, ...itens]);
    setTexto(""); setUrl("");
  }

  async function adicionarLista() {
    setErroLista("");
    const entradas = lista
      .split(/;|\s+\.\s+/)
      .map((item) => item.trim().replace(/\.$/, "").trim())
      .filter(Boolean)
      .map((item) => {
        const virgula = item.indexOf(",");
        if (virgula === -1) return { texto: item.trim(), url: null };
        return {
          texto: item.slice(0, virgula).trim(),
          url: item.slice(virgula + 1).trim() || null,
        };
      })
      .filter((item) => item.texto);

    if (entradas.length === 0) {
      setErroLista("Não encontrei nenhum item válido. Use: descrição,link; descrição,link");
      return;
    }

    setEnviandoLista(true);
    const { data: novos, error } = await supabase.from("conteudo_links").insert(entradas).select();
    if (!error && novos) {
      setItens([...novos, ...itens]);
      setLista("");
    } else {
      setErroLista("Não deu pra salvar a lista. Tente de novo.");
    }
    setEnviandoLista(false);
  }

  async function excluir(id) {
    await supabase.from("conteudo_links").delete().eq("id", id);
    setItens(itens.filter((i) => i.id !== id));
  }

  return (
    <div>
      <div className="card mb-6">
        <p className="field-label">Texto</p>
        <input value={texto} onChange={(e) => setTexto(e.target.value)} className="field-input mb-3" placeholder="Descrição do link" />
        <p className="field-label">URL (opcional)</p>
        <input value={url} onChange={(e) => setUrl(e.target.value)} className="field-input mb-3" placeholder="https://..." />
        <button onClick={adicionar} className="btn-primary w-full">Publicar</button>
      </div>

      <div className="card mb-6">
        <p className="field-label">Colar lista (vários de uma vez)</p>
        <textarea
          value={lista}
          onChange={(e) => setLista(e.target.value)}
          rows={5}
          className="field-input mb-2"
          placeholder={"descrição do site,https://link.com; outro site,https://outrolink.com"}
        />
        <p className="mb-3 text-xs text-muted">
          Vírgula separa descrição do link. Ponto e vírgula separa um item do outro.
        </p>
        <button onClick={adicionarLista} disabled={enviandoLista || !lista.trim()} className="btn-primary w-full">
          {enviandoLista ? "Publicando..." : "Publicar lista"}
        </button>
        {erroLista && <p className="mt-2 text-xs text-rust">{erroLista}</p>}
      </div>

      <div className="flex flex-col gap-2">
        {itens.map((i) => (
          <div key={i.id} className="flex items-start justify-between gap-2 rounded-sm border border-border bg-surface p-3">
            <div><p className="text-sm text-ink">{i.texto}</p>{i.url && <p className="text-xs text-muted">{i.url}</p>}</div>
            <button onClick={() => excluir(i.id)} className="shrink-0 text-muted hover:text-rust"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecaoWifi({ itens: itensIniciais }) {
  const [itens, setItens] = useState(itensIniciais);
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const supabase = createClient();

  async function adicionar() {
    if (!titulo.trim() || !texto.trim()) return;
    const { data: novo } = await supabase.from("conteudo_wifi_dicas").insert({ titulo: titulo.trim(), texto: texto.trim() }).select().single();
    if (novo) setItens([novo, ...itens]);
    setTitulo(""); setTexto("");
  }

  async function excluir(id) {
    await supabase.from("conteudo_wifi_dicas").delete().eq("id", id);
    setItens(itens.filter((i) => i.id !== id));
  }

  return (
    <div>
      <div className="card mb-6">
        <p className="field-label">Título</p>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="field-input mb-3" />
        <p className="field-label">Texto</p>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={2} className="field-input mb-3 resize-none" />
        <button onClick={adicionar} className="btn-primary w-full">Publicar</button>
      </div>
      <div className="flex flex-col gap-2">
        {itens.map((i) => (
          <div key={i.id} className="flex items-start justify-between gap-2 rounded-sm border border-border bg-surface p-3">
            <div><p className="text-sm text-ink">{i.titulo}</p><p className="text-xs text-muted">{i.texto}</p></div>
            <button onClick={() => excluir(i.id)} className="shrink-0 text-muted hover:text-rust"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecaoContatos({ itens: itensIniciais }) {
  const [itens, setItens] = useState(itensIniciais);
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [numero, setNumero] = useState("");
  const [lista, setLista] = useState("");
  const [enviandoLista, setEnviandoLista] = useState(false);
  const [erroLista, setErroLista] = useState("");
  const supabase = createClient();

  async function adicionar() {
    if (!nome.trim() || !categoria.trim() || !numero.trim()) return;
    const { data: novo } = await supabase.from("conteudo_contatos").insert({ nome: nome.trim(), categoria: categoria.trim(), numero: numero.trim() }).select().single();
    if (novo) setItens([novo, ...itens]);
    setNome(""); setCategoria(""); setNumero("");
  }

  async function adicionarLista() {
    setErroLista("");
    const entradas = lista
      .split(/;|\s+\.\s+/)
      .map((item) => item.trim().replace(/\.$/, "").trim())
      .filter(Boolean)
      .map((item) => {
        const [n, c, ...resto] = item.split(",").map((p) => p.trim());
        return { nome: n || "", categoria: c || "", numero: resto.join(", ").trim() };
      })
      .filter((item) => item.nome && item.categoria && item.numero);

    if (entradas.length === 0) {
      setErroLista("Não encontrei nenhum item válido. Use: nome,categoria,número; nome,categoria,número");
      return;
    }

    setEnviandoLista(true);
    const { data: novos, error } = await supabase.from("conteudo_contatos").insert(entradas).select();
    if (!error && novos) {
      setItens([...novos, ...itens]);
      setLista("");
    } else {
      setErroLista("Não deu pra salvar a lista. Tente de novo.");
    }
    setEnviandoLista(false);
  }

  async function excluir(id) {
    await supabase.from("conteudo_contatos").delete().eq("id", id);
    setItens(itens.filter((i) => i.id !== id));
  }

  return (
    <div>
      <div className="card mb-6 grid gap-3 sm:grid-cols-2">
        <div><p className="field-label">Nome</p><input value={nome} onChange={(e) => setNome(e.target.value)} className="field-input" /></div>
        <div><p className="field-label">Categoria</p><input value={categoria} onChange={(e) => setCategoria(e.target.value)} className="field-input" /></div>
        <div><p className="field-label">Número</p><input value={numero} onChange={(e) => setNumero(e.target.value)} className="field-input" /></div>
        <div className="flex items-end"><button onClick={adicionar} className="btn-primary w-full">Publicar</button></div>
      </div>

      <div className="card mb-6">
        <p className="field-label">Colar lista (vários de uma vez)</p>
        <textarea
          value={lista}
          onChange={(e) => setLista(e.target.value)}
          rows={5}
          className="field-input mb-2"
          placeholder={"nome,categoria,número; outro nome,categoria,número"}
        />
        <p className="mb-3 text-xs text-muted">
          Vírgula separa nome, categoria e número. Ponto e vírgula separa um contato do outro.
        </p>
        <button onClick={adicionarLista} disabled={enviandoLista || !lista.trim()} className="btn-primary w-full">
          {enviandoLista ? "Publicando..." : "Publicar lista"}
        </button>
        {erroLista && <p className="mt-2 text-xs text-rust">{erroLista}</p>}
      </div>

      <div className="flex flex-col gap-2">
        {itens.map((i) => (
          <div key={i.id} className="flex items-center justify-between gap-2 rounded-sm border border-border bg-surface p-3">
            <div><p className="text-sm text-ink">{i.nome}</p><p className="text-xs text-muted">{i.categoria} · {i.numero}</p></div>
            <button onClick={() => excluir(i.id)} className="shrink-0 text-muted hover:text-rust"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecaoSuporte({ chamadosIniciais }) {
  const [chamados, setChamados] = useState(
    chamadosIniciais.map((c) => ({
      ...c,
      mensagens: (c.mensagens_suporte || []).sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em)),
    }))
  );
  const [abertoId, setAbertoId] = useState(null);
  const [resposta, setResposta] = useState("");
  const supabase = createClient();
  const chamado = chamados.find((c) => c.id === abertoId);

  async function responder() {
    if (!resposta.trim() || !chamado) return;
    const { data: novaMsg } = await supabase
      .from("mensagens_suporte")
      .insert({ chamado_id: chamado.id, remetente: "suporte", texto: resposta.trim() })
      .select()
      .single();
    await supabase.from("chamados_suporte").update({ status: "respondido" }).eq("id", chamado.id);
    if (novaMsg) {
      setChamados(chamados.map((c) => (c.id === chamado.id ? { ...c, status: "respondido", mensagens: [...c.mensagens, novaMsg] } : c)));
      setResposta("");
    }
  }

  if (chamado) {
    return (
      <div>
        <button onClick={() => setAbertoId(null)} className="mb-4 flex items-center gap-1.5 text-sm text-muted"><ArrowLeft size={15} /> Voltar</button>
        <p className="font-extrabold tracking-tight text-lg text-ink">{chamado.nome || chamado.email}</p>
        <p className="mb-4 text-xs text-muted">{chamado.assunto}</p>
        <div className="mb-4 flex flex-col gap-2.5">
          {chamado.mensagens.map((m) => (
            <div key={m.id} className={`flex flex-col ${m.remetente === "suporte" ? "items-end" : "items-start"}`}>
              <div className={`max-w-[78%] rounded-sm px-3 py-2 text-sm leading-relaxed ${m.remetente === "suporte" ? "bg-amber text-ink" : "border border-border bg-surface text-ink"}`}>
                {m.texto}
              </div>
              <span className="mt-1 px-1 text-[10px] text-muted">{formatarHora(m.criado_em)}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={resposta} onChange={(e) => setResposta(e.target.value)} placeholder="Responder" className="field-input" onKeyDown={(e) => e.key === "Enter" && responder()} />
          <button onClick={responder} className="btn-primary shrink-0 px-3"><Send size={15} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {chamados.length === 0 && <p className="text-sm text-muted">Nenhum chamado ainda.</p>}
      {chamados.map((c) => (
        <button key={c.id} onClick={() => setAbertoId(c.id)} className="w-full rounded-sm border border-border bg-surface p-3 text-left">
          <div className="mb-1 flex items-start justify-between gap-2">
            <p className="text-sm text-ink">{c.nome || c.email}</p>
            <span className={`shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] ${c.status === "respondido" ? "border-olive text-olive" : "border-amber text-amber"}`}>
              {c.status === "respondido" ? "Respondido" : "Aberto"}
            </span>
          </div>
          <p className="mb-0.5 truncate text-xs text-muted">{c.assunto}</p>
          <p className="truncate text-xs text-muted">{c.mensagens[c.mensagens.length - 1]?.texto}</p>
        </button>
      ))}
    </div>
  );
}


const GRUPOS_TEXTOS = [
  {
    titulo: "Início",
    icon: Home,
    campos: [["inicio_titulo", "Título"], ["inicio_subtitulo", "Subtítulo"]],
  },
  {
    titulo: "Fotos",
    icon: ImageIcon,
    campos: [
      ["fotos_titulo", "Título"],
      ["fotos_subtitulo", "Subtítulo"],
      ["fotos_vazio", "Vazio"],
    ],
  },
  {
    titulo: "Locais seguros",
    icon: MapPin,
    campos: [
      ["locais_titulo", "Título"],
      ["locais_subtitulo", "Subtítulo"],
      ["locais_vazio", "Vazio"],
    ],
  },
  {
    titulo: "Lembretes",
    icon: Phone,
    campos: [
      ["lembretes_titulo", "Título"],
      ["lembretes_subtitulo", "Subtítulo"],
      ["lembretes_vazio", "Vazio"],
    ],
  },
  {
    titulo: "Links de ajuda",
    icon: Search,
    campos: [
      ["links_titulo", "Título"],
      ["links_subtitulo", "Subtítulo"],
      ["links_vazio", "Vazio"],
    ],
  },
  {
    titulo: "Wifi",
    icon: Wifi,
    campos: [
      ["wifi_titulo", "Título"],
      ["wifi_subtitulo", "Subtítulo"],
      ["wifi_vazio", "Vazio"],
    ],
  },
  {
    titulo: "Contatos úteis",
    icon: BookUser,
    campos: [
      ["contatos_titulo", "Título"],
      ["contatos_subtitulo", "Subtítulo"],
      ["contatos_vazio", "Vazio"],
    ],
  },
  {
    titulo: "Suporte",
    icon: Headset,
    campos: [["suporte_titulo", "Título"], ["suporte_subtitulo", "Subtítulo"]],
  },
  {
    titulo: "Conversas",
    icon: MessageCircle,
    campos: [
      ["conversas_titulo", "Título"],
      ["conversas_subtitulo", "Subtítulo"],
      ["conversas_reais_titulo", "Rótulo da lista de conversas de verdade"],
      ["conversas_reais_botao_nova", "Botão de nova conversa"],
      ["conversas_reais_vazio", "Texto de lista vazia (conversas de verdade)"],
      ["conversas_demo_titulo", "Rótulo da lista de conversas de exemplo"],
    ],
  },
  {
    titulo: "Assinatura",
    icon: CreditCard,
    campos: [["assinatura_titulo", "Título"], ["assinatura_texto", "Texto"]],
  },
  {
    titulo: "Login e criação de conta",
    icon: LogIn,
    campos: [
      ["login_selo", "Selo"],
      ["login_titulo", "Título"],
      ["login_subtitulo", "Subtítulo"],
      ["login_erro", "Mensagem de erro"],
      ["login_rodape", "Rodapé"],
    ],
  },
];

function SecaoTextos({ itens }) {
  const [categoriaAberta, setCategoriaAberta] = useState(GRUPOS_TEXTOS[0].titulo);
  const mapa = {};
  itens.forEach((t) => {
    mapa[t.chave] = t.valor;
  });

  return (
    <div>
      <p className="mb-4 text-xs text-muted">
        Clique numa categoria pra abrir, e em qualquer texto pra editar. Salva sozinho assim que
        você sai do campo.
      </p>
      <div className="flex flex-col gap-2">
        {GRUPOS_TEXTOS.map((grupo) => {
          const Icon = grupo.icon;
          const aberta = categoriaAberta === grupo.titulo;
          return (
            <div key={grupo.titulo} className="overflow-hidden rounded-sm border border-border bg-surface">
              <button
                onClick={() => setCategoriaAberta(aberta ? null : grupo.titulo)}
                className="flex w-full items-center gap-2.5 p-3 text-left"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber/20 text-ink">
                  <Icon size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-ink">{grupo.titulo}</p>
                  <p className="text-[11px] text-muted">
                    {grupo.campos.length} {grupo.campos.length === 1 ? "texto" : "textos"}
                  </p>
                </div>
                <ChevronDown
                  size={16}
                  className={`shrink-0 text-muted transition-transform ${aberta ? "rotate-180" : ""}`}
                />
              </button>
              {aberta && (
                <div className="border-t border-border px-3">
                  {grupo.campos.map(([chave, label]) => (
                    <TextoEditavel
                      key={chave}
                      chave={chave}
                      label={label}
                      valorInicial={mapa[chave] ?? TEXTOS_PADRAO[chave] ?? ""}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}


function TextoEditavel({ chave, label, valorInicial }) {
  const [salvo, setSalvo] = useState(valorInicial);
  const [valor, setValor] = useState(valorInicial);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const supabase = createClient();

  async function salvar() {
    setEditando(false);
    const novo = valor.trim();
    if (!novo || novo === salvo) {
      setValor(salvo);
      return;
    }
    setSalvando(true);
    const { error } = await supabase.from("conteudo_textos").upsert({ chave, valor: novo });
    if (!error) {
      setSalvo(novo);
    } else {
      setValor(salvo);
    }
    setSalvando(false);
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2.5 last:border-b-0">
      <p className="w-20 shrink-0 text-xs text-muted">{label}</p>
      {editando ? (
        <input
          autoFocus
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onBlur={salvar}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.target.blur();
            if (e.key === "Escape") {
              setValor(salvo);
              setEditando(false);
            }
          }}
          className="field-input flex-1"
        />
      ) : (
        <button
          onClick={() => setEditando(true)}
          className="flex-1 truncate text-left text-sm text-ink hover:text-amber"
        >
          {salvando ? "Salvando..." : salvo}
        </button>
      )}
    </div>
  );
}


const ORDENACOES_CLIENTES = [
  { id: "nome", label: "Nome" },
  { id: "criado_recente", label: "Criado: mais recente" },
  { id: "criado_antigo", label: "Criado: mais antigo" },
  { id: "acesso_recente", label: "Último acesso: mais recente" },
  { id: "acesso_antigo", label: "Último acesso: mais antigo / nunca" },
];

function SecaoClientes({ itens, erroConfig }) {
  const [clientes, setClientes] = useState(itens);
  const [ordenacao, setOrdenacao] = useState("nome");

  const clientesOrdenados = useMemo(() => {
    const lista = [...clientes];
    switch (ordenacao) {
      case "criado_recente":
        return lista.sort((a, b) => new Date(b.criadoEmIso) - new Date(a.criadoEmIso));
      case "criado_antigo":
        return lista.sort((a, b) => new Date(a.criadoEmIso) - new Date(b.criadoEmIso));
      case "acesso_recente":
        return lista.sort((a, b) => {
          if (!a.ultimoAcessoIso && !b.ultimoAcessoIso) return 0;
          if (!a.ultimoAcessoIso) return 1;
          if (!b.ultimoAcessoIso) return -1;
          return new Date(b.ultimoAcessoIso) - new Date(a.ultimoAcessoIso);
        });
      case "acesso_antigo":
        return lista.sort((a, b) => {
          if (!a.ultimoAcessoIso && !b.ultimoAcessoIso) return 0;
          if (!a.ultimoAcessoIso) return -1;
          if (!b.ultimoAcessoIso) return 1;
          return new Date(a.ultimoAcessoIso) - new Date(b.ultimoAcessoIso);
        });
      default:
        return lista.sort((a, b) => (a.nome || a.email).localeCompare(b.nome || b.email));
    }
  }, [clientes, ordenacao]);

  if (erroConfig) {
    return (
      <div className="card">
        <p className="text-sm text-ink">Isso ainda não foi configurado.</p>
        <p className="mt-1 text-xs text-muted">
          Falta ativar a chave de administração do Supabase no servidor. Fala com o Claude pra
          concluir essa configuração.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs text-muted">
          {clientes.length === 0
            ? "Nenhum cliente usando o app ainda."
            : `${clientes.length} cliente${clientes.length > 1 ? "s" : ""} usando o app.`}
        </p>
        <select
          value={ordenacao}
          onChange={(e) => setOrdenacao(e.target.value)}
          className="field-input w-auto shrink-0 py-1.5 text-xs"
        >
          {ORDENACOES_CLIENTES.map((o) => (
            <option key={o.id} value={o.id}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      {clientesOrdenados.map((cliente) => (
        <ClienteCard
          key={cliente.id}
          cliente={cliente}
          onRemovido={() => setClientes(clientes.filter((c) => c.id !== cliente.id))}
        />
      ))}
    </div>
  );
}

function ClienteCard({ cliente, onRemovido }) {
  const [mensagemAberta, setMensagemAberta] = useState(false);
  const [mensagem, setMensagem] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviada, setEnviada] = useState(false);
  const [confirmarRemocao, setConfirmarRemocao] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const [erro, setErro] = useState("");
  const supabase = createClient();

  async function enviarMensagem() {
    if (!mensagem.trim()) return;
    setEnviando(true);
    setErro("");

    const { data: chamado, error: erroChamado } = await supabase
      .from("chamados_suporte")
      .insert({ user_id: cliente.id, assunto: "Mensagem da administração", status: "respondido" })
      .select()
      .single();

    if (erroChamado || !chamado) {
      setErro("Não deu pra enviar. Tente de novo.");
      setEnviando(false);
      return;
    }

    const { error: erroMsg } = await supabase
      .from("mensagens_suporte")
      .insert({ chamado_id: chamado.id, remetente: "suporte", texto: mensagem.trim() });

    if (erroMsg) {
      setErro("Não deu pra enviar. Tente de novo.");
    } else {
      setMensagem("");
      setEnviada(true);
      setTimeout(() => {
        setEnviada(false);
        setMensagemAberta(false);
      }, 1500);
    }
    setEnviando(false);
  }

  async function remover() {
    if (!confirmarRemocao) {
      setConfirmarRemocao(true);
      setTimeout(() => setConfirmarRemocao(false), 4000);
      return;
    }
    setRemovendo(true);
    setErro("");
    try {
      const resposta = await fetch(`/api/admin/usuarios/${cliente.id}`, { method: "DELETE" });
      if (resposta.ok) {
        onRemovido();
        return;
      }
      setErro("Não deu pra remover essa conta. Tente de novo.");
    } catch {
      setErro("Não deu pra remover essa conta. Tente de novo.");
    }
    setConfirmarRemocao(false);
    setRemovendo(false);
  }

  return (
    <div className="rounded-sm border border-border bg-surface p-3">
      <div className="flex items-center gap-2.5">
        {cliente.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cliente.avatarUrl}
            alt=""
            className="h-9 w-9 shrink-0 rounded-full border border-border object-cover"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber/20 text-xs text-ink">
            {(cliente.nome || cliente.email || "?").slice(0, 1).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm text-ink">{cliente.nome || "Sem nome"}</p>
          <p className="truncate text-xs text-muted">{cliente.email}</p>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted">Entrou em {cliente.criadoEm}</p>
      <p className="text-[11px] text-muted">
        {cliente.ultimoAcessoIso ? `Último acesso ${tempoRelativo(cliente.ultimoAcessoIso)}` : "Nunca acessou o app"}
      </p>
      <p className="text-[11px] text-muted">
        {cliente.telefone ? `Telefone: ${formatarTelefone(cliente.telefone)}` : "Telefone: não informado"}
      </p>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => setMensagemAberta(!mensagemAberta)}
          className="flex-1 rounded-sm border border-border px-2 py-1.5 text-xs text-ink"
        >
          Mandar mensagem
        </button>
        <button
          onClick={remover}
          disabled={removendo}
          className={`flex-1 rounded-sm border px-2 py-1.5 text-xs ${
            confirmarRemocao ? "border-rust bg-rust/10 text-rust" : "border-border text-muted"
          }`}
        >
          {removendo ? "Removendo..." : confirmarRemocao ? "Confirmar remoção" : "Remover conta"}
        </button>
      </div>

      {mensagemAberta && (
        <div className="mt-3 border-t border-border pt-3">
          <textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            rows={2}
            placeholder="Escreva a mensagem"
            className="field-input mb-2 resize-none"
          />
          <button
            onClick={enviarMensagem}
            disabled={enviando || !mensagem.trim()}
            className="btn-primary w-full"
          >
            {enviando ? "Enviando..." : enviada ? "Enviada!" : "Enviar"}
          </button>
        </div>
      )}

      {erro && <p className="mt-2 text-xs text-rust">{erro}</p>}
    </div>
  );
}


const TIPOS_CONVERSA_DEMO = [
  { id: "normal", label: "Conversa normal (2 pessoas)" },
  { id: "grupo", label: "Conversa em grupo" },
];

function SecaoConversasDemo({ itens: itensIniciais }) {
  const [conversas, setConversas] = useState(itensIniciais);
  const [tipo, setTipo] = useState("normal");
  const [titulo, setTitulo] = useState("");
  const [analisando, setAnalisando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagensParaSalvar, setMensagensParaSalvar] = useState(null);
  const [participantesDetectados, setParticipantesDetectados] = useState([]);
  const [voce, setVoce] = useState("");
  const [modoManual, setModoManual] = useState(false);
  const [nomeOutraPessoa, setNomeOutraPessoa] = useState("");
  const [rascunhoNomeOutraPessoa, setRascunhoNomeOutraPessoa] = useState("");
  const [remetenteAtual, setRemetenteAtual] = useState("Você");
  const [textoAtual, setTextoAtual] = useState("");
  const [abertaId, setAbertaId] = useState(null);
  const [mensagensPorConversa, setMensagensPorConversa] = useState({});
  const [carregandoId, setCarregandoId] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [edicaoTitulo, setEdicaoTitulo] = useState("");
  const [edicaoVoce, setEdicaoVoce] = useState("");
  const [fotoArquivo, setFotoArquivo] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [edicaoFotoArquivo, setEdicaoFotoArquivo] = useState(null);
  const [edicaoFotoPreview, setEdicaoFotoPreview] = useState(null);
  const [liberacaoMinutos, setLiberacaoMinutos] = useState("");
  const [liberacaoInicial, setLiberacaoInicial] = useState("");
  const [edicaoLiberacaoMinutos, setEdicaoLiberacaoMinutos] = useState("");
  const [edicaoLiberacaoInicial, setEdicaoLiberacaoInicial] = useState("");
  const supabase = createClient();

  // Cada vez que essa aba é aberta, o componente monta de novo (o painel
  // só existe enquanto a aba está selecionada) — por isso busca a lista
  // atualizada aqui, em vez de confiar só no que veio do carregamento
  // inicial da página, que fica desatualizado assim que você cria uma
  // conversa nova e troca de aba.
  useEffect(() => {
    supabase
      .from("conversas_demo")
      .select("*")
      .order("criado_em", { ascending: false })
      .then(({ data }) => {
        if (data) setConversas(data);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function mudarTipo(novoTipo) {
    setTipo(novoTipo);
    limparRascunho();
  }

  function limparRascunho() {
    setMensagensParaSalvar(null);
    setParticipantesDetectados([]);
    setVoce("");
    setModoManual(false);
    setNomeOutraPessoa("");
    setRascunhoNomeOutraPessoa("");
    setRemetenteAtual("Você");
    setTextoAtual("");
    setErro("");
    setFotoArquivo(null);
    setFotoPreview(null);
    setLiberacaoMinutos("");
    setLiberacaoInicial("");
  }

  function escolherFoto(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setFotoArquivo(arquivo);
    const leitor = new FileReader();
    leitor.onload = () => setFotoPreview(leitor.result);
    leitor.readAsDataURL(arquivo);
  }

  function escolherFotoEdicao(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setEdicaoFotoArquivo(arquivo);
    const leitor = new FileReader();
    leitor.onload = () => setEdicaoFotoPreview(leitor.result);
    leitor.readAsDataURL(arquivo);
  }

  function lerArquivo(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setErro("");
    if (!titulo.trim()) {
      setErro("Dê um título (nome do contato ou do grupo) antes de escolher o arquivo.");
      e.target.value = "";
      return;
    }
    setAnalisando(true);
    arquivo.text().then((textoArquivo) => {
      const msgs = parseWhatsAppTxt(textoArquivo);
      if (msgs.length === 0) {
        setErro("Não consegui separar nenhuma mensagem desse arquivo. Confere se é o .txt exportado do WhatsApp.");
        setAnalisando(false);
        e.target.value = "";
        return;
      }
      const participantes = remetentesUnicos(msgs);
      setMensagensParaSalvar(msgs);
      setParticipantesDetectados(participantes);
      setVoce(participantes[0] || "");
      setAnalisando(false);
      e.target.value = "";
    });
  }

  function iniciarModoManual() {
    setErro("");
    if (!titulo.trim()) {
      setErro("Dê um título (nome do contato) antes de escrever as mensagens.");
      return;
    }
    setModoManual(true);
  }

  function confirmarNomeOutraPessoa() {
    const nome = rascunhoNomeOutraPessoa.trim();
    if (!nome) return;
    setNomeOutraPessoa(nome);
    setParticipantesDetectados(["Você", nome]);
    setVoce("Você");
    setRemetenteAtual("Você");
    setMensagensParaSalvar([]);
  }

  function adicionarMensagemManual() {
    const texto = textoAtual.trim();
    if (!texto) return;
    setMensagensParaSalvar((atual) => [...(atual || []), { remetente: remetenteAtual, texto, dataHoraIso: null }]);
    setTextoAtual("");
  }

  function removerUltimaMensagemManual() {
    setMensagensParaSalvar((atual) => (atual || []).slice(0, -1));
  }

  async function salvar() {
    if (!mensagensParaSalvar || mensagensParaSalvar.length === 0 || !titulo.trim()) return;
    setSalvando(true);
    setErro("");

    let fotoUrl = null;
    let fotoCaminho = null;
    if (fotoArquivo) {
      const caminho = `conversas-fotos/${Date.now()}-${fotoArquivo.name}`;
      const { error: erroFoto } = await supabase.storage.from("conteudo").upload(caminho, fotoArquivo);
      if (!erroFoto) {
        const { data: { publicUrl } } = supabase.storage.from("conteudo").getPublicUrl(caminho);
        fotoUrl = publicUrl;
        fotoCaminho = caminho;
      }
    }

    const { data: conversa, error: erroConversa } = await supabase
      .from("conversas_demo")
      .insert({
        tipo,
        titulo: titulo.trim(),
        participante_voce: voce,
        participantes: participantesDetectados,
        total_mensagens: mensagensParaSalvar.length,
        foto_url: fotoUrl,
        foto_caminho: fotoCaminho,
        liberacao_intervalo_minutos: liberacaoMinutos ? parseInt(liberacaoMinutos, 10) : null,
        liberacao_quantidade_inicial: liberacaoInicial !== "" ? parseInt(liberacaoInicial, 10) : null,
      })
      .select()
      .single();

    if (erroConversa || !conversa) {
      setErro("Não deu pra salvar a conversa. Tente de novo.");
      setSalvando(false);
      return;
    }

    const linhas = mensagensParaSalvar.map((m, i) => ({
      conversa_id: conversa.id,
      ordem: i,
      remetente: m.remetente,
      texto: m.texto,
      enviado_em: m.dataHoraIso,
    }));

    const { error: erroMsgs } = await supabase.from("mensagens_demo").insert(linhas);
    if (erroMsgs) {
      setErro("A conversa foi criada, mas as mensagens não salvaram direito. Exclua e tente de novo.");
    }

    setConversas([conversa, ...conversas]);
    setMensagensPorConversa((atual) => ({ ...atual, [conversa.id]: mensagensParaSalvar }));
    setTitulo("");
    limparRascunho();
    setSalvando(false);
  }

  async function verConversa(conversa) {
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
    setMensagensPorConversa((atual) => ({ ...atual, [conversa.id]: (data || []).map((m) => ({ ...m, dataHoraIso: m.enviado_em })) }));
    setCarregandoId(null);
  }

  async function excluir(conversa) {
    if (conversa.foto_caminho) {
      await supabase.storage.from("conteudo").remove([conversa.foto_caminho]);
    }
    await supabase.from("conversas_demo").delete().eq("id", conversa.id);
    setConversas(conversas.filter((c) => c.id !== conversa.id));
    if (abertaId === conversa.id) setAbertaId(null);
  }

  function iniciarEdicao(conversa) {
    setEditandoId(conversa.id);
    setEdicaoTitulo(conversa.titulo);
    setEdicaoVoce(conversa.participante_voce || "");
    setEdicaoFotoArquivo(null);
    setEdicaoFotoPreview(conversa.foto_url || null);
    setEdicaoLiberacaoMinutos(
      conversa.liberacao_intervalo_minutos != null ? String(conversa.liberacao_intervalo_minutos) : ""
    );
    setEdicaoLiberacaoInicial(
      conversa.liberacao_quantidade_inicial != null ? String(conversa.liberacao_quantidade_inicial) : ""
    );
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setEdicaoFotoArquivo(null);
    setEdicaoFotoPreview(null);
    setEdicaoLiberacaoMinutos("");
    setEdicaoLiberacaoInicial("");
  }

  async function salvarEdicao(conversa) {
    let fotoUrl = conversa.foto_url || null;
    let fotoCaminho = conversa.foto_caminho || null;
    if (edicaoFotoArquivo) {
      const caminho = `conversas-fotos/${Date.now()}-${edicaoFotoArquivo.name}`;
      const { error: erroFoto } = await supabase.storage.from("conteudo").upload(caminho, edicaoFotoArquivo);
      if (!erroFoto) {
        if (conversa.foto_caminho) {
          await supabase.storage.from("conteudo").remove([conversa.foto_caminho]);
        }
        const { data: { publicUrl } } = supabase.storage.from("conteudo").getPublicUrl(caminho);
        fotoUrl = publicUrl;
        fotoCaminho = caminho;
      }
    }
    const { data, error } = await supabase
      .from("conversas_demo")
      .update({
        titulo: edicaoTitulo.trim() || conversa.titulo,
        participante_voce: edicaoVoce,
        foto_url: fotoUrl,
        foto_caminho: fotoCaminho,
        liberacao_intervalo_minutos: edicaoLiberacaoMinutos ? parseInt(edicaoLiberacaoMinutos, 10) : null,
        liberacao_quantidade_inicial: edicaoLiberacaoInicial !== "" ? parseInt(edicaoLiberacaoInicial, 10) : null,
      })
      .eq("id", conversa.id)
      .select()
      .single();
    if (!error && data) {
      setConversas(conversas.map((c) => (c.id === conversa.id ? data : c)));
      setEditandoId(null);
      setEdicaoFotoArquivo(null);
      setEdicaoFotoPreview(null);
      setEdicaoLiberacaoMinutos("");
      setEdicaoLiberacaoInicial("");
    }
  }

  const compondoManualmente = modoManual && nomeOutraPessoa;

  return (
    <div>
      <div className="mb-4 rounded-sm border border-olive/40 bg-olive/10 px-3 py-2.5 text-xs text-muted">
        Sobe um .txt exportado de uma conversa do WhatsApp (grupo ou normal), ou — só em conversa
        normal, de 2 pessoas — escreve as mensagens uma por uma na mão. O sistema separa as
        mensagens sozinho e a conversa aparece pros clientes verem como fica.
      </div>

      <div className="card mb-6">
        <p className="field-label">Tipo</p>
        <select value={tipo} onChange={(e) => mudarTipo(e.target.value)} className="field-input mb-3">
          {TIPOS_CONVERSA_DEMO.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>

        <p className="field-label">Título (nome do contato ou do grupo)</p>
        <input
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          placeholder="Ex: Maria, ou Grupo da Família"
          className="field-input mb-3"
        />

        <p className="field-label">Foto (opcional)</p>
        <div className="mb-3 flex items-center gap-3">
          {fotoPreview ? (
            <img src={fotoPreview} alt="" className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber/20 text-ink">
              {tipo === "grupo" ? <Users size={18} /> : <MessageCircle size={18} />}
            </div>
          )}
          <label className="btn-secondary cursor-pointer text-xs">
            Escolher foto
            <input type="file" accept="image/*" onChange={escolherFoto} className="hidden" />
          </label>
        </div>

        <p className="field-label">Liberação gradual do histórico (opcional)</p>
        <input
          type="number"
          min="0"
          value={liberacaoMinutos}
          onChange={(e) => setLiberacaoMinutos(e.target.value)}
          placeholder="Minutos entre cada mensagem antiga aparecer. Vazio = mostra tudo de uma vez."
          className="field-input mb-2"
        />
        {liberacaoMinutos && (
          <input
            type="number"
            min="0"
            value={liberacaoInicial}
            onChange={(e) => setLiberacaoInicial(e.target.value)}
            placeholder="Quantas mensagens já aparecem liberadas no início (vazio = 1)"
            className="field-input mb-3"
          />
        )}

        {!mensagensParaSalvar && !modoManual && (
          <div className={tipo === "normal" ? "flex gap-2" : ""}>
            <label className="btn-primary block flex-1 cursor-pointer text-center">
              {analisando ? "Lendo arquivo..." : "Escolher arquivo .txt"}
              <input type="file" accept=".txt" onChange={lerArquivo} disabled={analisando} className="hidden" />
            </label>
            {tipo === "normal" && (
              <button onClick={iniciarModoManual} className="btn-secondary flex-1">
                Escrever mensagem por mensagem
              </button>
            )}
          </div>
        )}

        {modoManual && !nomeOutraPessoa && (
          <div>
            <p className="field-label">Nome da outra pessoa (quem vai aparecer do lado esquerdo)</p>
            <input
              autoFocus
              value={rascunhoNomeOutraPessoa}
              onChange={(e) => setRascunhoNomeOutraPessoa(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && confirmarNomeOutraPessoa()}
              placeholder="Ex: Maria"
              className="field-input mb-3"
            />
            <div className="flex gap-2">
              <button onClick={limparRascunho} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button
                onClick={confirmarNomeOutraPessoa}
                disabled={!rascunhoNomeOutraPessoa.trim()}
                className="btn-primary flex-1"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {compondoManualmente && (
          <div className="mb-3">
            <p className="field-label">Quem está escrevendo?</p>
            <div className="mb-2 flex gap-2">
              {["Você", nomeOutraPessoa].map((nome) => (
                <button
                  key={nome}
                  onClick={() => setRemetenteAtual(nome)}
                  className={`flex-1 rounded-sm border px-2 py-1.5 text-xs ${
                    remetenteAtual === nome ? "border-amber bg-amber text-ink" : "border-border text-muted"
                  }`}
                >
                  {nome}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                autoFocus
                value={textoAtual}
                onChange={(e) => setTextoAtual(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && adicionarMensagemManual()}
                placeholder="Mensagem"
                className="field-input"
              />
              <button onClick={adicionarMensagemManual} disabled={!textoAtual.trim()} className="btn-primary shrink-0 px-3">
                Adicionar
              </button>
            </div>
            {mensagensParaSalvar?.length > 0 && (
              <button onClick={removerUltimaMensagemManual} className="mt-2 text-xs text-muted underline">
                Remover última mensagem
              </button>
            )}
          </div>
        )}

        {mensagensParaSalvar && mensagensParaSalvar.length > 0 && (
          <div>
            <p className="mb-2 text-xs text-muted">
              {mensagensParaSalvar.length} mensagens {modoManual ? "adicionadas" : "encontradas"}, de{" "}
              {participantesDetectados.length} {participantesDetectados.length === 1 ? "participante" : "participantes"}.
            </p>

            {!modoManual && (
              <>
                <p className="field-label">Quem é você nessa conversa? (fica do lado direito)</p>
                <select value={voce} onChange={(e) => setVoce(e.target.value)} className="field-input mb-3">
                  {participantesDetectados.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </>
            )}

            <p className="mb-2 text-xs text-muted">Prévia:</p>
            <div
              ref={(el) => {
                if (el) el.scrollTop = el.scrollHeight;
              }}
              className="mb-3 max-h-80 overflow-y-auto rounded-sm border border-border bg-base p-3"
            >
              <ConversaBolhas
                mensagens={mensagensParaSalvar}
                participanteVoce={voce}
                tipo={tipo}
                participantes={participantesDetectados}
              />
            </div>

            <div className="flex gap-2">
              <button onClick={limparRascunho} className="btn-secondary flex-1" disabled={salvando}>
                Cancelar
              </button>
              <button onClick={salvar} className="btn-primary flex-1" disabled={salvando}>
                {salvando ? "Salvando..." : "Salvar conversa"}
              </button>
            </div>
          </div>
        )}

        {erro && <p className="mt-3 text-xs text-rust">{erro}</p>}
      </div>

      <p className="mb-2 text-xs text-muted">
        {conversas.length === 0 ? "Nenhuma conversa de exemplo criada ainda." : `${conversas.length} conversa${conversas.length > 1 ? "s" : ""} criada${conversas.length > 1 ? "s" : ""}.`}
      </p>
      <div className="flex flex-col gap-2">
        {conversas.map((c) => (
          <div key={c.id} className="rounded-sm border border-border bg-surface p-3">
            {editandoId === c.id ? (
              <div>
                <p className="field-label">Título</p>
                <input
                  value={edicaoTitulo}
                  onChange={(e) => setEdicaoTitulo(e.target.value)}
                  className="field-input mb-3"
                />
                <p className="field-label">Quem é você nessa conversa?</p>
                <select
                  value={edicaoVoce}
                  onChange={(e) => setEdicaoVoce(e.target.value)}
                  className="field-input mb-3"
                >
                  {(c.participantes || []).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
                <p className="field-label">Foto</p>
                <div className="mb-3 flex items-center gap-3">
                  {edicaoFotoPreview ? (
                    <img src={edicaoFotoPreview} alt="" className="h-12 w-12 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber/20 text-ink">
                      {c.tipo === "grupo" ? <Users size={18} /> : <MessageCircle size={18} />}
                    </div>
                  )}
                  <label className="btn-secondary cursor-pointer text-xs">
                    Trocar foto
                    <input type="file" accept="image/*" onChange={escolherFotoEdicao} className="hidden" />
                  </label>
                </div>
                <p className="field-label">Liberação gradual do histórico (opcional)</p>
                <input
                  type="number"
                  min="0"
                  value={edicaoLiberacaoMinutos}
                  onChange={(e) => setEdicaoLiberacaoMinutos(e.target.value)}
                  placeholder="Minutos entre cada mensagem antiga aparecer. Vazio = mostra tudo de uma vez."
                  className="field-input mb-2"
                />
                {edicaoLiberacaoMinutos && (
                  <input
                    type="number"
                    min="0"
                    value={edicaoLiberacaoInicial}
                    onChange={(e) => setEdicaoLiberacaoInicial(e.target.value)}
                    placeholder="Quantas mensagens já aparecem liberadas no início (vazio = 1)"
                    className="field-input mb-3"
                  />
                )}
                <div className="flex gap-2">
                  <button onClick={cancelarEdicao} className="btn-secondary flex-1">
                    Cancelar
                  </button>
                  <button onClick={() => salvarEdicao(c)} className="btn-primary flex-1">
                    Salvar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
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
                    <div className="flex items-center gap-1.5">
                      <p className="truncate text-sm text-ink">{c.titulo}</p>
                      <span className="shrink-0 rounded-sm border border-border px-1.5 py-0.5 text-[10px] text-muted">
                        {c.tipo === "grupo" ? "Grupo" : "Normal"}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted">{c.total_mensagens} mensagens · você é {c.participante_voce}</p>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button onClick={() => verConversa(c)} className="rounded-sm border border-border px-2 py-1 text-xs text-ink">
                    {abertaId === c.id ? "Ocultar" : "Ver"}
                  </button>
                  <button onClick={() => iniciarEdicao(c)} className="text-muted hover:text-ink">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => excluir(c)} className="text-muted hover:text-rust">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )}
            {abertaId === c.id && editandoId !== c.id && (
              <div
                ref={(el) => {
                  if (el) el.scrollTop = el.scrollHeight;
                }}
                className="mt-3 max-h-96 overflow-y-auto rounded-sm border border-border bg-base p-3"
              >
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


function SecaoAjudaRapida({ itens: itensIniciais }) {
  const [itens, setItens] = useState(itensIniciais);
  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState("");
  const supabase = createClient();

  async function adicionar() {
    if (!pergunta.trim() || !resposta.trim()) return;
    const { data: novo } = await supabase
      .from("conteudo_ajuda_rapida")
      .insert({ pergunta: pergunta.trim(), resposta: resposta.trim() })
      .select()
      .single();
    if (novo) setItens([...itens, novo]);
    setPergunta("");
    setResposta("");
  }

  async function excluir(id) {
    await supabase.from("conteudo_ajuda_rapida").delete().eq("id", id);
    setItens(itens.filter((i) => i.id !== id));
  }

  return (
    <div>
      <p className="mb-4 text-xs text-muted">
        Essas perguntas aparecem primeiro no Suporte, antes da pessoa abrir um chamado com você.
        A ordem daqui é a ordem que aparece lá (as mais novas vão pro final da lista).
      </p>
      <div className="card mb-6">
        <p className="field-label">Pergunta</p>
        <input
          value={pergunta}
          onChange={(e) => setPergunta(e.target.value)}
          placeholder="Ex: Como troco minha foto de perfil?"
          className="field-input mb-3"
        />
        <p className="field-label">Resposta</p>
        <textarea
          value={resposta}
          onChange={(e) => setResposta(e.target.value)}
          rows={3}
          placeholder="Explica o passo a passo aqui"
          className="field-input mb-3 resize-none"
        />
        <button onClick={adicionar} className="btn-primary w-full">
          Publicar
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {itens.length === 0 && (
          <p className="text-sm text-muted">
            Nenhuma pergunta cadastrada ainda — sem isso, o Suporte vai direto pro formulário de
            chamado.
          </p>
        )}
        {itens.map((i) => (
          <div key={i.id} className="flex items-start justify-between gap-2 rounded-sm border border-border bg-surface p-3">
            <div>
              <p className="text-sm text-ink">{i.pergunta}</p>
              <p className="text-xs text-muted">{i.resposta}</p>
            </div>
            <button onClick={() => excluir(i.id)} className="shrink-0 text-muted hover:text-rust">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function SecaoReembolsos({ itens, erroConfig }) {
  if (erroConfig) {
    return (
      <div className="card">
        <p className="text-sm text-ink">Isso ainda não foi configurado.</p>
        <p className="mt-1 text-xs text-muted">
          Falta ativar a chave de administração do Supabase no servidor. Fala com o Claude pra
          concluir essa configuração.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-xs text-muted">
        Todo pedido aqui já foi aceito — não precisa aprovar nada. O prazo de 4 dias é só pra você
        fazer o reembolso na plataforma de pagamento.
      </p>
      {itens.length === 0 ? (
        <p className="text-sm text-muted">Nenhum pedido de reembolso ainda.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {itens.map((p) => {
            const { concluido, textoRestante } = calcularEtapaReembolso(p.criado_em);
            const cancelado = p.status === "cancelado";
            const abandonado = p.status === "abandonado";
            return (
              <div key={p.id} className="rounded-sm border border-border bg-surface p-3">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="text-sm text-ink">{p.nome || p.email}</p>
                  <span
                    className={`shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] ${
                      cancelado || abandonado
                        ? "border-muted text-muted"
                        : concluido
                        ? "border-olive text-olive"
                        : "border-amber text-amber"
                    }`}
                  >
                    {abandonado
                      ? "Conversa abandonada"
                      : cancelado
                      ? "Cancelado"
                      : concluido
                      ? "Concluído"
                      : `Faltam ${textoRestante}`}
                  </span>
                </div>
                <p className="mb-1 text-xs text-muted">{p.email}</p>
                <p className="text-sm text-ink">{p.motivo || "Não chegou a contar o motivo."}</p>
                <p className="mt-1 text-[10px] text-muted">
                  Pedido feito em {new Date(p.criado_em).toLocaleDateString("pt-BR")}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
