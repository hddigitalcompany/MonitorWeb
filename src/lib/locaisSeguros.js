const ROTULOS = { police: "Delegacia de polícia", hospital: "Hospital", fire_station: "Corpo de bombeiros" };
const SERVIDORES = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter"];

export function coordenadasValidas(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

// Usa o limite administrativo do município, não um raio que mistura cidades.
export function consultaMunicipio({ lat, lon, areaId }) {
  if (!coordenadasValidas(lat, lon)) throw new Error("Não foi possível identificar as coordenadas da cidade.");
  const area = Number.isSafeInteger(areaId) && areaId > 0
    ? `area(${areaId})->.cidade;`
    : `is_in(${lat},${lon})->.areas;
area.areas["boundary"="administrative"]["admin_level"="8"]->.cidade;`;
  return `[out:json][timeout:12];${area}
.cidade out tags;
nwr(area.cidade)["amenity"~"^(police|hospital|fire_station)$"];out center;`;
}

// Recupera contas antigas que só têm o nome da cidade no histórico.
// Cache diário por cidade evita geocodificar cada visita novamente.
export async function resolverCoordenadas(localizacao) {
  const temCoordenadas = coordenadasValidas(localizacao.lat, localizacao.lon);
  const [cidade, estado, pais] = (localizacao.texto || "").split(",").map((p) => p.trim());
  if (!cidade || !estado) {
    if (temCoordenadas) return localizacao;
    throw new Error("Ainda não foi possível identificar sua cidade. Tente novamente.");
  }
  try {
    const parametros = new URLSearchParams({ city: cidade, state: estado, country: pais || "Brasil", format: "jsonv2", featureType: "city", limit: "1" });
    const resposta = await fetch(`https://nominatim.openstreetmap.org/search?${parametros}`, {
      headers: { "User-Agent": "MonitorWeb/1.0 (https://github.com/hddigitalcompany/MonitorWeb)" },
      signal: AbortSignal.timeout(6000),
      next: { revalidate: 86400 },
    });
    if (!resposta.ok) throw new Error("Não foi possível localizar sua cidade agora. Tente novamente.");
    const [encontrada] = await resposta.json();
    const lat = encontrada?.lat == null ? NaN : Number(encontrada.lat);
    const lon = encontrada?.lon == null ? NaN : Number(encontrada.lon);
    if (!coordenadasValidas(lat, lon)) throw new Error("Não encontramos as coordenadas da cidade capturada.");
    // Consultar diretamente a área municipal evita recalcular os limites
    // a cada IP e permite reutilizar o cache entre usuários da mesma cidade.
    const areaId = encontrada.osm_type === "relation" && Number.isSafeInteger(encontrada.osm_id)
      ? encontrada.osm_id + 3600000000 : undefined;
    return { ...localizacao, lat, lon, areaId };
  } catch (erro) {
    if (temCoordenadas) return localizacao;
    throw erro;
  }
}

export function interpretarLocais(dados, localizacao) {
  if (dados.remark || !Array.isArray(dados.elements)) throw new Error("Busca de locais incompleta.");
  const municipio = dados.elements.find((el) => el.tags?.boundary === "administrative" && el.tags?.admin_level === "8");
  if (!municipio) throw new Error("Não foi possível localizar os limites desta cidade.");
  const lat = municipio.center?.lat ?? localizacao.lat;
  const lon = municipio.center?.lon ?? localizacao.lon;
  if (!coordenadasValidas(lat, lon)) throw new Error("A cidade não tem coordenadas disponíveis.");
  const locais = dados.elements.flatMap((el) => {
    const tipo = ROTULOS[el.tags?.amenity];
    const latitude = el.lat ?? el.center?.lat;
    const longitude = el.lon ?? el.center?.lon;
    if (!tipo || !coordenadasValidas(latitude, longitude)) return [];
    const endereco = [el.tags["addr:street"], el.tags["addr:housenumber"], el.tags["addr:suburb"]].filter(Boolean).join(", ");
    return [{ id: `${el.type}/${el.id}`, nome: el.tags.name || tipo, tipo, lat: latitude, lon: longitude, endereco }];
  }).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR") || a.id.localeCompare(b.id));
  return { lat, lon, cidade: municipio.tags.name || localizacao.texto, locais };
}

export async function buscarLocaisSegurosCidade(localizacao) {
  const resolvida = await resolverCoordenadas(localizacao);
  const consulta = consultaMunicipio(resolvida);
  for (const servidor of SERVIDORES) {
    try {
      const resposta = await fetch(`${servidor}?data=${encodeURIComponent(consulta)}`, {
        headers: { "User-Agent": "MonitorWeb/1.0 (https://github.com/hddigitalcompany/MonitorWeb)" },
        signal: AbortSignal.timeout(14000),
        next: { revalidate: 3600 },
      });
      if (!resposta.ok) throw new Error(`Serviço de locais: ${resposta.status}`);
      return interpretarLocais(await resposta.json(), resolvida);
    } catch (erro) {
      console.error("[locaisSeguros]", erro.message);
    }
  }
  return {
    lat: resolvida.lat, lon: resolvida.lon,
    cidade: resolvida.texto?.split(",")[0]?.trim() || "Sua cidade",
    locais: [],
    aviso: "O mapa está disponível, mas a consulta aos locais está temporariamente indisponível.",
  };
}
