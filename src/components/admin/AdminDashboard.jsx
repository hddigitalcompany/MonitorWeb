"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Trash2, Upload, Send, ArrowLeft } from "lucide-react";
import { extrairIdYoutube } from "@/lib/youtube";
import { TEXTOS_PADRAO } from "@/lib/textos";
import { calcularEtapaReembolso } from "@/lib/reembolso";

const SECOES = [
  { id: "video", label: "Vídeo do dia" },
  { id: "fotos", label: "Fotos" },
  { id: "locais", label: "Locais seguros" },
  { id: "lembretes", label: "Lembretes" },
  { id: "links", label: "Links de ajuda" },
  { id: "wifi", label: "Wifi" },
  { id: "contatos", label: "Contatos úteis" },
  { id: "ajuda", label: "Ajuda rápida" },
  { id: "suporte", label: "Suporte" },
  { id: "clientes", label: "Clientes" },
  { id: "reembolsos", label: "Reembolsos" },
  { id: "textos", label: "Textos" },
];

export default function AdminDashboard({ dadosIniciais }) {
  const [secao, setSecao] = useState("video");

  return (
    <div className="mx-auto max-w-2xl px-5 py-8">
      <p className="mb-1 font-serif text-2xl text-ink">Administração</p>
      <p className="mb-6 text-sm text-muted">Publique conteúdo e responda chamados de suporte.</p>

      <div className="mb-6 flex flex-wrap gap-1.5 border-b border-border pb-4">
        {SECOES.map((s) => (
          <button
            key={s.id}
            onClick={() => setSecao(s.id)}
            className={`rounded-sm px-3 py-1.5 text-xs ${
              secao === s.id ? "bg-amber text-base" : "border border-border text-muted"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {secao === "video" && <SecaoVideo itens={dadosIniciais.videos} />}
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
      {secao === "clientes" && (
        <SecaoClientes itens={dadosIniciais.clientes} erroConfig={dadosIniciais.erroClientes} />
      )}
      {secao === "reembolsos" && (
        <SecaoReembolsos itens={dadosIniciais.reembolsos} erroConfig={dadosIniciais.erroClientes} />
      )}
      {secao === "textos" && <SecaoTextos itens={dadosIniciais.textos} />}
    </div>
  );
}

function SecaoVideo({ itens: itensIniciais }) {
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
    const caminho = `video-dia/${Date.now()}-${arquivo.name}`;
    const { error } = await supabase.storage.from("conteudo").upload(caminho, arquivo);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("conteudo").getPublicUrl(caminho);
      const { data: novo } = await supabase
        .from("conteudo_video_dia")
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
      .from("conteudo_video_dia")
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
    await supabase.from("conteudo_video_dia").delete().eq("id", item.id);
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
      <p className="mb-2 text-xs text-muted">O mais recente é o que aparece na Início.</p>
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
  const supabase = createClient();

  async function enviar(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setEnviando(true);
    const caminho = `fotos/${Date.now()}-${arquivo.name}`;
    const { error } = await supabase.storage.from("conteudo").upload(caminho, arquivo);
    if (!error) {
      const { data: { publicUrl } } = supabase.storage.from("conteudo").getPublicUrl(caminho);
      const { data: nova } = await supabase.from("conteudo_fotos").insert({ url: publicUrl, caminho }).select().single();
      if (nova) setItens([nova, ...itens]);
    }
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
        <Upload size={15} /> {enviando ? "Enviando..." : "Subir foto"}
        <input type="file" accept="image/*" onChange={enviar} disabled={enviando} className="hidden" />
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
  const supabase = createClient();

  async function adicionar() {
    if (!texto.trim()) return;
    const { data: novo } = await supabase.from(tabela).insert({ texto: texto.trim() }).select().single();
    if (novo) setItens([novo, ...itens]);
    setTexto("");
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
        <p className="mb-4 font-serif text-lg text-ink">{chamado.assunto}</p>
        <div className="mb-4 flex flex-col gap-2.5">
          {chamado.mensagens.map((m) => (
            <div key={m.id} className={`flex ${m.remetente === "suporte" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-sm px-3 py-2 text-sm leading-relaxed ${m.remetente === "suporte" ? "bg-amber text-base" : "border border-border bg-surface text-ink"}`}>
                {m.texto}
              </div>
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
            <p className="text-sm text-ink">{c.assunto}</p>
            <span className={`shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] ${c.status === "respondido" ? "border-olive text-olive" : "border-amber text-amber"}`}>
              {c.status === "respondido" ? "Respondido" : "Aberto"}
            </span>
          </div>
          <p className="truncate text-xs text-muted">{c.mensagens[c.mensagens.length - 1]?.texto}</p>
        </button>
      ))}
    </div>
  );
}


const GRUPOS_TEXTOS = [
  { titulo: "Início", campos: [["inicio_titulo", "Título"], ["inicio_subtitulo", "Subtítulo"]] },
  { titulo: "Fotos", campos: [["fotos_titulo", "Título"], ["fotos_subtitulo", "Subtítulo"]] },
  { titulo: "Locais seguros", campos: [["locais_titulo", "Título"], ["locais_subtitulo", "Subtítulo"]] },
  { titulo: "Lembretes", campos: [["lembretes_titulo", "Título"], ["lembretes_subtitulo", "Subtítulo"]] },
  { titulo: "Links de ajuda", campos: [["links_titulo", "Título"], ["links_subtitulo", "Subtítulo"]] },
  { titulo: "Wifi", campos: [["wifi_titulo", "Título"], ["wifi_subtitulo", "Subtítulo"]] },
  { titulo: "Contatos úteis", campos: [["contatos_titulo", "Título"], ["contatos_subtitulo", "Subtítulo"]] },
  { titulo: "Suporte", campos: [["suporte_titulo", "Título"], ["suporte_subtitulo", "Subtítulo"]] },
  { titulo: "Conversas", campos: [["conversas_titulo", "Título"], ["conversas_subtitulo", "Subtítulo"]] },
  { titulo: "Assinatura", campos: [["assinatura_titulo", "Título"]] },
];

function SecaoTextos({ itens }) {
  const mapa = {};
  itens.forEach((t) => {
    mapa[t.chave] = t.valor;
  });

  return (
    <div>
      <p className="mb-4 text-xs text-muted">
        Clique em qualquer texto pra editar. Salva sozinho assim que você sai do campo.
      </p>
      {GRUPOS_TEXTOS.map((grupo) => (
        <div key={grupo.titulo} className="card mb-4">
          <p className="mb-2 text-sm text-ink">{grupo.titulo}</p>
          {grupo.campos.map(([chave, label]) => (
            <TextoEditavel
              key={chave}
              chave={chave}
              label={label}
              valorInicial={mapa[chave] ?? TEXTOS_PADRAO[chave] ?? ""}
            />
          ))}
        </div>
      ))}
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


function SecaoClientes({ itens, erroConfig }) {
  const [clientes, setClientes] = useState(itens);

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
      <p className="mb-2 text-xs text-muted">
        {clientes.length === 0
          ? "Nenhum cliente usando o app ainda."
          : `${clientes.length} cliente${clientes.length > 1 ? "s" : ""} usando o app.`}
      </p>
      {clientes.map((cliente) => (
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
            return (
              <div key={p.id} className="rounded-sm border border-border bg-surface p-3">
                <div className="mb-1 flex items-start justify-between gap-2">
                  <p className="text-sm text-ink">{p.nome || p.email}</p>
                  <span
                    className={`shrink-0 rounded-sm border px-1.5 py-0.5 text-[10px] ${
                      concluido ? "border-olive text-olive" : "border-amber text-amber"
                    }`}
                  >
                    {concluido ? "Concluído" : `Faltam ${textoRestante}`}
                  </span>
                </div>
                <p className="mb-1 text-xs text-muted">{p.email}</p>
                <p className="text-sm text-ink">{p.motivo}</p>
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
