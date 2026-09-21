import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Identifica o tipo de aparelho/navegador a partir do User-Agent que o
// próprio navegador manda em toda visita — não precisa perguntar nada
// pra pessoa. Serve pra ter prova de acesso (aparelho + localização) caso
// alguém diga que não recebeu o entregável.
function dispositivoDoUserAgent(ua) {
  if (!ua) return null;

  const ehIOS = /iPhone|iPad|iPod/i.test(ua);
  const ehAndroid = /Android/i.test(ua);
  const ehMac = /Macintosh/i.test(ua) && !ehIOS;
  const ehWindows = /Windows/i.test(ua);
  const ehLinux = /Linux/i.test(ua) && !ehAndroid;

  let sistema = "Aparelho não identificado";
  if (/iPad/i.test(ua)) sistema = "iPad";
  else if (ehIOS) sistema = "iPhone";
  else if (ehAndroid) sistema = "Android";
  else if (ehMac) sistema = "Mac";
  else if (ehWindows) sistema = "Windows";
  else if (ehLinux) sistema = "Linux";

  let navegador = "";
  if (/EdgA?\//i.test(ua)) navegador = "Edge";
  else if (/CriOS\//i.test(ua)) navegador = "Chrome";
  else if (/FxiOS\//i.test(ua)) navegador = "Firefox";
  else if (/Firefox\//i.test(ua)) navegador = "Firefox";
  else if (/Chrome\//i.test(ua) && !/Chromium\//i.test(ua)) navegador = "Chrome";
  else if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) navegador = "Safari";

  return navegador ? `${sistema} - ${navegador}` : sistema;
}

// Só chama esse serviço externo de geolocalização por IP quando o
// navegador ainda não mandou uma localização já resolvida antes na mesma
// sessão (ver DashboardChrome) — assim não estoura o limite de chamadas
// do serviço gratuito à toa, pedindo de novo a cada aba que a pessoa abre.
async function localizacaoDoIp(ip) {
  if (!ip || ip === "127.0.0.1" || ip === "::1") return null;
  try {
    const resposta = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: AbortSignal.timeout(2500),
      headers: { "User-Agent": "painel-pessoal" },
    });
    if (!resposta.ok) return null;
    const dados = await resposta.json();
    if (dados.error) return null;
    const partes = [dados.city, dados.region, dados.country_name].filter(Boolean);
    return partes.length > 0 ? partes.join(", ") : null;
  } catch {
    return null;
  }
}

export async function POST(request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ erro: "Não autenticado." }, { status: 401 });
  }

  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "Corpo inválido." }, { status: 400 });
  }

  const rota = corpo?.rota;
  if (!rota || typeof rota !== "string") {
    return NextResponse.json({ erro: "Rota inválida." }, { status: 400 });
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null;
  const dispositivo = dispositivoDoUserAgent(request.headers.get("user-agent"));

  const localizacaoConhecida =
    typeof corpo?.localizacaoConhecida === "string" && corpo.localizacaoConhecida.trim()
      ? corpo.localizacaoConhecida.trim()
      : null;
  const localizacao = localizacaoConhecida || (await localizacaoDoIp(ip));

  const { error } = await supabase
    .from("eventos_visita")
    .insert({ user_id: user.id, rota, dispositivo, localizacao });

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, localizacao });
}
