"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import MapaLocalizacao from "@/components/MapaLocalizacao";

export default function LocaisDaCidade() {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const [selecionado, setSelecionado] = useState(null);
  const mapaRef = useRef(null);
  const [categoria, setCategoria] = useState("");
  const [busca, setBusca] = useState("");
  const categorias = useMemo(() => [...new Set((dados?.locais || []).map((local) => local.categoria))].sort(), [dados]);
  const filtrados = useMemo(() => {
    const normalizar = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const termo = normalizar(busca.trim());
    return (dados?.locais || []).filter((local) =>
      (!categoria || local.categoria === categoria) &&
      (!termo || normalizar(`${local.nome} ${local.tipo} ${local.endereco}`).includes(termo))
    );
  }, [dados, categoria, busca]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelado = false;
    const timer = setTimeout(() => controller.abort(), 45000);
    setErro("");
    setDados(null);
    setSelecionado(null);
    fetch("/api/locais-seguros", { signal: controller.signal, cache: "no-store" })
      .then(async (resposta) => {
        const resultado = await resposta.json();
        if (!resposta.ok) throw new Error(resultado.erro || "Não foi possível buscar os locais.");
        return resultado;
      })
      .then((resultado) => { if (!cancelado) setDados({ ...resultado, locais: resultado.locais.slice(0, 10) }); })
      .catch((e) => { if (!cancelado) setErro(e.name === "AbortError" ? "A busca demorou mais que o esperado. Tente novamente." : e.message); })
      .finally(() => clearTimeout(timer));
    return () => { cancelado = true; clearTimeout(timer); controller.abort(); };
  }, [tentativa]);

  if (erro) return (
    <div className="mb-6 rounded-sm border border-border bg-surface p-4" role="alert">
      <p className="mb-3 text-sm text-muted">{erro}</p>
      <button className="btn-secondary" onClick={() => setTentativa((n) => n + 1)}>Tentar novamente</button>
    </div>
  );
  if (!dados) return <p className="mb-6 text-sm text-muted" role="status">Buscando locais na sua cidade...</p>;

  return (
    <section className="mb-6">
      <p className="mb-2 text-sm font-semibold text-ink">Locais em {dados.cidade}</p>
      {dados.locais.length > 0 && (
        <div className="mb-3 grid gap-2">
          <label className="text-xs text-muted" htmlFor="categoria-local">Tipo de local</label>
          <select id="categoria-local" className="field-input" value={categoria}
            onChange={(e) => { setCategoria(e.target.value); setSelecionado(null); }}>
            <option value="">Todos os tipos</option>
            {categorias.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <input className="field-input" aria-label="Buscar local por nome ou endereço" placeholder="Buscar por nome ou endereço" value={busca}
            onChange={(e) => { setBusca(e.target.value); setSelecionado(null); }} />
        </div>
      )}
      <div ref={mapaRef}>
        <MapaLocalizacao {...dados} locais={filtrados} selecionado={selecionado} />
      </div>
      <p className="mb-3 text-xs text-muted">Cidade identificada pela conexão, de forma aproximada. Os círculos mostram distância, não uma garantia de segurança da região.</p>
      {dados.aviso ? (
        <div role="status">
          <p className="mb-2 text-sm text-muted">{dados.aviso}</p>
          <button className="btn-secondary" onClick={() => setTentativa((n) => n + 1)}>Buscar locais novamente</button>
        </div>
      ) : dados.locais.length === 0 ? (
        <p className="text-sm text-muted">Não encontramos estabelecimentos do dia a dia cadastrados no mapa desta cidade.</p>
      ) : filtrados.length === 0 ? (
        <p className="text-sm text-muted">Nenhum local corresponde à busca. Experimente outro nome ou tipo.</p>
      ) : (
        <>
          <p className="mb-2 text-xs text-muted">{filtrados.length} locais · Toque para ver no mapa</p>
          <div className="flex max-h-96 flex-col gap-2 overflow-y-auto">
            {filtrados.map((local, indice) => (
              <button key={local.id} className="flex items-start gap-3 rounded-sm border border-border bg-surface p-3 text-left hover:bg-surface2"
                onClick={() => { setSelecionado(local.id); mapaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber text-xs font-bold text-ink">{indice + 1}</span>
                <span>
                  <span className="block text-sm font-semibold text-ink">{local.nome}</span>
                  <span className="block text-xs text-muted">{local.tipo}</span>
                  {local.endereco && <span className="block text-xs text-muted">{local.endereco}</span>}
                </span>
              </button>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
