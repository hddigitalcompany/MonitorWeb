"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { Upload, FileText } from "lucide-react";

function contarMensagens(texto) {
  const linhas = texto.split("\n");
  const padrao = /^\d{1,2}\/\d{1,2}\/\d{2,4},?\s+\d{1,2}:\d{2}/;
  return linhas.filter((linha) => padrao.test(linha.trim())).length;
}

export default function ImportarConversas({ conversasIniciais, userId }) {
  const [conversas, setConversas] = useState(conversasIniciais);
  const [mostrandoForm, setMostrandoForm] = useState(false);
  const [contato, setContato] = useState("");
  const [erro, setErro] = useState("");
  const [processando, setProcessando] = useState(false);
  const supabase = createClient();

  const agrupadas = useMemo(() => {
    const grupos = {};
    conversas.forEach((c) => {
      if (!grupos[c.contato]) grupos[c.contato] = [];
      grupos[c.contato].push(c);
    });
    return Object.entries(grupos);
  }, [conversas]);

  async function importarArquivo(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (!contato.trim()) {
      setErro("Diga com quem é essa conversa antes de escolher o arquivo.");
      e.target.value = "";
      return;
    }
    if (!arquivo.name.endsWith(".txt")) {
      setErro("Envie o arquivo .txt exportado pelo WhatsApp.");
      e.target.value = "";
      return;
    }

    setProcessando(true);
    setErro("");
    const texto = await arquivo.text();
    const totalMensagens = contarMensagens(texto);

    const { data: nova, error } = await supabase
      .from("conversas_importadas")
      .insert({
        user_id: userId,
        contato: contato.trim(),
        nome_arquivo: arquivo.name,
        total_mensagens: totalMensagens,
      })
      .select()
      .single();

    if (!error && nova) {
      setConversas([nova, ...conversas]);
      setMostrandoForm(false);
      setContato("");
    } else {
      setErro("Não deu pra importar o arquivo.");
    }
    setProcessando(false);
    e.target.value = "";
  }

  return (
    <div>
      <div className="mb-4 rounded-sm border border-olive/40 bg-olive/10 px-3 py-2.5 text-xs text-muted">
        Isso é opcional. Só sobe se você quiser — pra organizar suas próprias conversas aqui dentro.
      </div>

      {!mostrandoForm ? (
        <button onClick={() => setMostrandoForm(true)} className="btn-secondary mb-6 w-full">
          <Upload size={15} strokeWidth={1.75} />
          Importar conversa (.txt)
        </button>
      ) : (
        <div className="card mb-6">
          <p className="field-label">Com quem é essa conversa?</p>
          <input
            value={contato}
            onChange={(e) => setContato(e.target.value)}
            placeholder="Nome do contato"
            className="field-input mb-3"
          />
          <label className="btn-primary block cursor-pointer text-center">
            {processando ? "Importando..." : "Escolher arquivo e importar"}
            <input type="file" accept=".txt" onChange={importarArquivo} disabled={processando} className="hidden" />
          </label>
          {erro && <p className="mt-2 text-xs text-rust">{erro}</p>}
        </div>
      )}

      {agrupadas.length === 0 ? (
        <p className="text-sm text-muted">Nenhuma conversa importada ainda.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {agrupadas.map(([nomeContato, arquivos]) => (
            <div key={nomeContato}>
              <div className="mb-2 flex items-center gap-2">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface2 text-xs text-ink">
                  {nomeContato.charAt(0).toUpperCase()}
                </div>
                <p className="text-sm text-ink">{nomeContato}</p>
              </div>
              <div className="flex flex-col gap-1.5 pl-8">
                {arquivos.map((a) => (
                  <div key={a.id} className="flex items-center gap-2 rounded-sm border border-border bg-surface p-2.5">
                    <FileText size={14} className="text-muted" />
                    <div>
                      <p className="text-xs text-ink">{a.nome_arquivo}</p>
                      <p className="text-[11px] text-muted">{a.total_mensagens} mensagens</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
