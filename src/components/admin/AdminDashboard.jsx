"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Trash2, Upload, Send, ArrowLeft } from "lucide-react";
import { extrairIdYoutube } from "@/lib/youtube";

const SECOES = [
  { id: "video", label: "Vídeo do dia" },
  { id: "fotos", label: "Fotos" },
  { id: "locais", label: "Locais seguros" },
  { id: "lembretes", label: "Lembretes" },
  { id: "links", label: "Links de ajuda" },
  { id: "wifi", label: "Wifi" },
  { id: "contatos", label: "Contatos úteis" },
  { id: "suporte", label: "Suporte" },
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
      {secao === "suporte" && <SecaoSuporte chamadosIniciais={dadosIniciais.chamados} />}
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
  const [hora, setHora] = useState("");
  const [atividade, setAtividade] = useState("");
  const supabase = createClient();

  function ordenar(a, b) {
    if (!a.hora && !b.hora) return 0;
    if (!a.hora) return 1;
    if (!b.hora) return -1;
    return a.hora.localeCompare(b.hora);
  }

  async function adicionar() {
    if (!atividade.trim()) return;
    const { data: novo } = await supabase
      .from("conteudo_lembretes")
      .insert({ hora: hora || null, atividade: atividade.trim(), texto: atividade.trim() })
      .select()
      .single();
    if (novo) setItens([...itens, novo].sort(ordenar));
    setHora("");
    setAtividade("");
  }

  async function excluir(id) {
    await supabase.from("conteudo_lembretes").delete().eq("id", id);
    setItens(itens.filter((i) => i.id !== id));
  }

  return (
    <div>
      <div className="card mb-6">
        <p className="field-label">Hora</p>
        <input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="field-input mb-3" />
        <p className="field-label">Atividade</p>
        <input
          value={atividade}
          onChange={(e) => setAtividade(e.target.value)}
          placeholder="Ex: Tomar remédio"
          className="field-input mb-3"
        />
        <button onClick={adicionar} className="btn-primary w-full">Publicar</button>
      </div>
      <div className="flex flex-col gap-2">
        {[...itens].sort(ordenar).map((i) => (
          <div key={i.id} className="flex items-center justify-between gap-2 rounded-sm border border-border bg-surface p-3">
            <div className="flex items-center gap-3">
              {i.hora && (
                <span className="shrink-0 rounded-sm bg-amber/20 px-2 py-1 text-xs font-medium text-ink">{i.hora}</span>
              )}
              <p className="text-sm text-ink">{i.atividade || i.texto}</p>
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
  const supabase = createClient();

  async function adicionar() {
    if (!texto.trim()) return;
    const { data: novo } = await supabase.from("conteudo_links").insert({ texto: texto.trim(), url: url.trim() || null }).select().single();
    if (novo) setItens([novo, ...itens]);
    setTexto(""); setUrl("");
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
  const supabase = createClient();

  async function adicionar() {
    if (!nome.trim() || !categoria.trim() || !numero.trim()) return;
    const { data: novo } = await supabase.from("conteudo_contatos").insert({ nome: nome.trim(), categoria: categoria.trim(), numero: numero.trim() }).select().single();
    if (novo) setItens([novo, ...itens]);
    setNome(""); setCategoria(""); setNumero("");
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
