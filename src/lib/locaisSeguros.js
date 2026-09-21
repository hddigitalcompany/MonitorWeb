// Busca locais realmente seguros (delegacia, hospital, corpo de bombeiros)
// perto de uma coordenada, usando dados públicos do OpenStreetMap
// (Overpass API) — sem chave, sem custo, e são lugares que existem de
// verdade, não uma sugestão inventada.

const ROTULO_TIPO = {
  police: "Delegacia de polícia",
  hospital: "Hospital",
  fire_station: "Corpo de bombeiros",
};

const TIPOS_BUSCADOS = Object.keys(ROTULO_TIPO);

function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function buscarLocaisSegurosProximos(lat, lon, raioMetros = 12000) {
  if (typeof lat !== "number" || typeof lon !== "number") return [];

  const filtros = TIPOS_BUSCADOS.map(
    (tipo) => `node["amenity"="${tipo}"](around:${raioMetros},${lat},${lon});`
  ).join("\n");
  const consulta = `[out:json][timeout:15];(${filtros});out center 40;`;

  try {
    const resposta = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `data=${encodeURIComponent(consulta)}`,
      signal: AbortSignal.timeout(9000),
    });
    if (!resposta.ok) return [];
    const dados = await resposta.json();
    const elementos = dados?.elements || [];

    return elementos
      .filter((el) => el.lat && el.lon && el.tags?.amenity)
      .map((el) => ({
        id: el.id,
        nome: el.tags.name || ROTULO_TIPO[el.tags.amenity] || "Local seguro",
        tipo: ROTULO_TIPO[el.tags.amenity] || el.tags.amenity,
        lat: el.lat,
        lon: el.lon,
        distanciaKm: distanciaKm(lat, lon, el.lat, el.lon),
      }))
      .sort((a, b) => a.distanciaKm - b.distanciaKm)
      .slice(0, 20);
  } catch (err) {
    console.error("[locaisSeguros] erro ao buscar locais próximos:", err?.message || err);
    return [];
  }
}
