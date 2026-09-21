export async function localizacaoDoIp(ip) {
  if (!ip || ip === "127.0.0.1" || ip === "::1") return null;
  try {
    const resposta = await fetch(`https://ipapi.co/${encodeURIComponent(ip)}/json/`, {
      signal: AbortSignal.timeout(2500),
      headers: { "User-Agent": "painel-pessoal" },
      cache: "no-store",
    });
    if (!resposta.ok) return null;
    const dados = await resposta.json();
    if (dados.error) return null;
    const texto = [dados.city, dados.region, dados.country_name].filter(Boolean).join(", ");
    return { texto, lat: dados.latitude ?? null, lon: dados.longitude ?? null };
  } catch {
    return null;
  }
}
