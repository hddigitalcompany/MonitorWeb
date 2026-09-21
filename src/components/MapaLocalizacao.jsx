"use client";

import { useEffect, useRef, useState } from "react";

const LEAFLET_CSS = "/vendor/leaflet/leaflet.css";
const LEAFLET_JS = "/vendor/leaflet/leaflet.js";
const RAIO_METROS = 500;
let carregamento;

function carregarLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (carregamento) return carregamento;
  carregamento = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    const timer = setTimeout(() => falhar(), 12000);
    function falhar() {
      clearTimeout(timer);
      script.remove();
      reject(new Error("Não foi possível carregar o mapa."));
    }
    script.onload = () => {
      clearTimeout(timer);
      if (window.L) resolve(window.L);
      else falhar();
    };
    script.onerror = falhar;
    document.body.appendChild(script);
  }).catch((erro) => { carregamento = null; throw erro; });
  return carregamento;
}

export default function MapaLocalizacao({ lat, lon, cidade, locais, selecionado }) {
  const elementoRef = useRef(null);
  const mapaRef = useRef(null);
  const marcadoresRef = useRef(new Map());
  const [erro, setErro] = useState(false);
  const [carregado, setCarregado] = useState(false);
  const [tentativa, setTentativa] = useState(0);

  useEffect(() => {
    let cancelado = false;
    let observador;
    setErro(false);
    setCarregado(false);
    carregarLeaflet().then((L) => {
      if (cancelado || !elementoRef.current) return;
      const mapa = L.map(elementoRef.current, { center: [lat, lon], zoom: 12, scrollWheelZoom: false, preferCanvas: true });
      mapaRef.current = mapa;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapa);
      const limites = L.latLngBounds([]);
      locais.forEach((local, indice) => {
        const circulo = L.circle([local.lat, local.lon], {
          radius: RAIO_METROS, color: "#4F6B3F", weight: 2, fillColor: "#C6F136", fillOpacity: 0.18,
        }).addTo(mapa);
        limites.extend(circulo.getBounds());
        const popup = document.createElement("div");
        const titulo = document.createElement("strong");
        titulo.textContent = local.nome;
        const descricao = document.createElement("p");
        descricao.textContent = `${local.tipo} · raio de 500 m`;
        popup.append(titulo, descricao);
        const marcador = L.marker([local.lat, local.lon], {
          title: local.nome,
          icon: L.divIcon({ className: "", html: `<span style="display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:#334b28;color:white;border:2px solid white;font:bold 12px sans-serif;box-shadow:0 1px 4px #555">${indice + 1}</span>`, iconSize: [28, 28], iconAnchor: [14, 14] }),
        }).addTo(mapa).bindPopup(popup);
        marcadoresRef.current.set(local.id, { marcador, circulo });
      });
      if (limites.isValid()) mapa.fitBounds(limites, { padding: [20, 20], maxZoom: 14 });
      observador = new ResizeObserver(() => mapa.invalidateSize());
      observador.observe(elementoRef.current);
      mapa.invalidateSize();
      setCarregado(true);
    }).catch(() => { if (!cancelado) setErro(true); });
    return () => {
      cancelado = true;
      observador?.disconnect();
      mapaRef.current?.remove();
      mapaRef.current = null;
      marcadoresRef.current.clear();
    };
  }, [lat, lon, locais, tentativa]);

  useEffect(() => {
    const item = marcadoresRef.current.get(selecionado);
    if (item && mapaRef.current && carregado) {
      mapaRef.current.fitBounds(item.circulo.getBounds(), { padding: [25, 25], maxZoom: 16 });
      item.marcador.openPopup();
    }
  }, [selecionado, carregado]);

  return (
    <div className="mb-4 overflow-hidden rounded-sm border border-border bg-surface">
      <div className="relative isolate h-80 w-full">
        <div ref={elementoRef} className="h-full w-full" role="region" aria-label={`Mapa dos locais do dia a dia em ${cidade}`} />
        {!carregado && (
          <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center gap-3 bg-surface p-4 text-sm text-muted" role="status">
            {erro ? "Não foi possível carregar o mapa." : "Carregando mapa..."}
            {erro && <button className="btn-secondary" onClick={() => setTentativa((n) => n + 1)}>Tentar novamente</button>}
          </div>
        )}
      </div>
      <p className="border-t border-border px-3 py-2 text-xs text-muted">
        {cidade} · Cada círculo indica um raio de 500 metros ao redor do local.
      </p>
    </div>
  );
}
