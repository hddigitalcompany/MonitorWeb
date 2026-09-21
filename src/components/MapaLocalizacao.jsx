"use client";

import { useEffect, useRef, useState } from "react";

const LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
const LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
const RAIO_METROS = 12000;

function carregarLeaflet() {
  if (window.L) return Promise.resolve(window.L);
  if (window.__painelPessoalLeafletPromise) return window.__painelPessoalLeafletPromise;

  window.__painelPessoalLeafletPromise = new Promise((resolve, reject) => {
    if (!document.querySelector(`link[href="${LEAFLET_CSS}"]`)) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = LEAFLET_CSS;
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.src = LEAFLET_JS;
    script.async = true;
    script.onload = () => resolve(window.L);
    script.onerror = () => reject(new Error("Não deu pra carregar o mapa."));
    document.body.appendChild(script);
  });

  return window.__painelPessoalLeafletPromise;
}

// Mostra o mapa da cidade onde o próprio usuário está (pela localização por
// IP, aproximada) com um círculo de 12km — não é um ponto exato, é uma
// região, porque a localização por IP não tem precisão de rua. Os locais
// seguros de verdade (delegacia, hospital, bombeiro) vêm do OpenStreetMap.
export default function MapaLocalizacao({ lat, lon, cidade, locais = [] }) {
  const elementoRef = useRef(null);
  const mapaRef = useRef(null);
  const [erro, setErro] = useState(false);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    if (typeof lat !== "number" || typeof lon !== "number") return;
    let cancelado = false;

    carregarLeaflet()
      .then((L) => {
        if (cancelado || !elementoRef.current || mapaRef.current) return;

        const mapa = L.map(elementoRef.current, {
          center: [lat, lon],
          zoom: 11,
          scrollWheelZoom: false,
        });
        mapaRef.current = mapa;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; colaboradores do OpenStreetMap",
          maxZoom: 19,
        }).addTo(mapa);

        L.circle([lat, lon], {
          radius: RAIO_METROS,
          color: "#4F6B3F",
          weight: 2,
          fillColor: "#C6F136",
          fillOpacity: 0.15,
        }).addTo(mapa);

        L.marker([lat, lon])
          .addTo(mapa)
          .bindPopup("Você está por aqui")
          .openPopup();

        locais.forEach((local) => {
          L.marker([local.lat, local.lon])
            .addTo(mapa)
            .bindPopup(`<strong>${local.nome}</strong><br />${local.tipo}`);
        });

        mapa.fitBounds(L.circle([lat, lon], { radius: RAIO_METROS }).getBounds(), { padding: [8, 8] });
        setCarregado(true);
      })
      .catch(() => setErro(true));

    return () => {
      cancelado = true;
      if (mapaRef.current) {
        mapaRef.current.remove();
        mapaRef.current = null;
      }
    };
  }, [lat, lon, locais]);

  if (typeof lat !== "number" || typeof lon !== "number") {
    return (
      <div className="mb-4 rounded-sm border border-border bg-surface p-3 text-sm text-muted">
        Ainda estamos identificando sua localização — abra o app de novo daqui a pouco pra ver o mapa.
      </div>
    );
  }

  if (erro) {
    return (
      <div className="mb-4 rounded-sm border border-border bg-surface p-3 text-sm text-muted">
        Não deu pra carregar o mapa agora. Tente de novo mais tarde.
      </div>
    );
  }

  return (
    <div className="mb-4 overflow-hidden rounded-sm border border-border bg-surface">
      {!carregado && (
        <div className="flex h-64 items-center justify-center text-sm text-muted">Carregando mapa...</div>
      )}
      <div ref={elementoRef} className="h-64 w-full" style={{ display: carregado ? "block" : "none" }} />
      {cidade && (
        <p className="border-t border-border px-3 py-2 text-xs text-muted">
          Região aproximada: <span className="font-semibold text-ink">{cidade}</span> (raio de 12km)
        </p>
      )}
    </div>
  );
}
