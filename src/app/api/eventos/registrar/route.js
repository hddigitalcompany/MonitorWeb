import { localizacaoDoIp } from "@/lib/localizacao";
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

  // O navegador manda de volta a localização já resolvida antes na mesma
  // sessão (ver DashboardChrome), pra não chamar o serviço externo de
  // geolocalização a cada aba nova que a pessoa abre.
  const conhecida = corpo?.localizacaoConhecida;
  const jaConhecida =
    conhecida && typeof conhecida === "object" && typeof conhecida.texto === "string" && conhecida.texto.trim()
      ? { texto: conhecida.texto.trim(), lat: conhecida.lat ?? null, lon: conhecida.lon ?? null }
      : null;
  const resolvida = jaConhecida || (await localizacaoDoIp(ip));
  const localizacao = resolvida?.texto || null;
  const lat = resolvida?.lat ?? null;
  const lon = resolvida?.lon ?? null;

  const { error } = await supabase
    .from("eventos_visita")
    .insert({ user_id: user.id, rota, dispositivo, localizacao, ip });

  if (error) {
    return NextResponse.json({ erro: error.message }, { status: 500 });
  }

  // Guarda a localização mais recente no perfil do próprio usuário — é o
  // que alimenta o mapa da aba Local (só ele enxerga o dele).
  if (typeof lat === "number" && typeof lon === "number") {
    const { error: erroPerfil } = await supabase
      .from("perfis_usuario")
      .update({ localizacao_lat: lat, localizacao_lon: lon, localizacao_cidade: localizacao })
      .eq("user_id", user.id);
    if (erroPerfil) {
      console.error(
        "[eventos/registrar] erro ao salvar localização no perfil (rodou a migração de localizacao_lat/lon?):",
        erroPerfil.message
      );
    }
  }

  return NextResponse.json({ ok: true, localizacao, lat, lon });
}
