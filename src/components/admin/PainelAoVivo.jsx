"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const FUSO_BR = "America/Sao_Paulo";
const JANELA_AGORA_MIN = 5; // "navegando agora" = teve visita nos últimos 5 minutos
const JANELA_ENGAJAMENTO_DIAS = 30;

const ROTULOS_ROTA = {
  "/": "Login / criar conta",
  "/dashboard/inicio": "Início",
  "/dashboard/fotos": "Fotos",
  "/dashboard/locais-seguros": "Local",
  "/dashboard/lembretes": "Lembretes",
  "/dashboard/links-ajuda": "Links",
  "/dashboard/wifi": "Wifi",
  "/dashboard/conversas": "Conversas",
  "/dashboard/contatos": "Contatos",
  "/dashboard/suporte": "Suporte",
  "/dashboard/assinatura": "Assinatura",
};

function rotuloRota(rota) {
  return ROTULOS_ROTA[rota] || rota;
}

// Todo o cálculo de "que dia/hora é isso" é feito no fuso do Brasil, não
// importa de onde quem está vendo o painel está acessando.
function partesBR(data) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO_BR,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
  });
  const partes = {};
  fmt.formatToParts(data).forEach((p) => {
    partes[p.type] = p.value;
  });
  let hora = Number(partes.hour);
  if (hora === 24) hora = 0;
  return { ano: Number(partes.year), mes: Number(partes.month), dia: Number(partes.day), hora };
}

function diaDeData(data) {
  const p = partesBR(data);
  return { ano: p.ano, mes: p.mes, dia: p.dia };
}

function chaveDia({ ano, mes, dia }) {
  return `${ano}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

function somaDias({ ano, mes, dia }, delta) {
  const d = new Date(Date.UTC(ano, mes - 1, dia));
  d.setUTCDate(d.getUTCDate() + delta);
  return { ano: d.getUTCFullYear(), mes: d.getUTCMonth() + 1, dia: d.getUTCDate() };
}

function diaDaSemana({ ano, mes, dia }) {
  return new Date(Date.UTC(ano, mes - 1, dia)).getUTCDay(); // 0 = domingo
}

// Gráfico de "horário de pico": uma curva suave (tipo gráfico de ações),
// não barrinhas, pra dar pra ver o formato do dia de cara, sem precisar
// tocar em nada.
const GRAFICO_PICO_LARGURA = 240;
const GRAFICO_PICO_ALTURA = 90;
const GRAFICO_PICO_PAD_TOPO = 14;
const GRAFICO_PICO_PAD_BASE = 4;

function pontosGraficoPico(valores) {
  const max = Math.max(1, ...valores);
  const n = valores.length;
  const util = GRAFICO_PICO_ALTURA - GRAFICO_PICO_PAD_TOPO - GRAFICO_PICO_PAD_BASE;
  return valores.map((v, i) => ({
    x: n > 1 ? (i / (n - 1)) * GRAFICO_PICO_LARGURA : GRAFICO_PICO_LARGURA / 2,
    y: GRAFICO_PICO_PAD_TOPO + (1 - v / max) * util,
  }));
}

// Curva suave passando pelos pontos: em cada ponto do meio, desenha até o
// meio-do-caminho pro próximo, usando o ponto atual como "puxador" da
// curva — assim não fica com cantos duros feito um gráfico de linha reto.
function pathLinhaSuave(pontos) {
  if (pontos.length === 0) return "";
  if (pontos.length === 1) return `M ${pontos[0].x} ${pontos[0].y}`;
  let d = `M ${pontos[0].x} ${pontos[0].y}`;
  for (let i = 1; i < pontos.length - 1; i++) {
    const xMeio = (pontos[i].x + pontos[i + 1].x) / 2;
    const yMeio = (pontos[i].y + pontos[i + 1].y) / 2;
    d += ` Q ${pontos[i].x} ${pontos[i].y} ${xMeio} ${yMeio}`;
  }
  const ultimo = pontos[pontos.length - 1];
  d += ` Q ${ultimo.x} ${ultimo.y} ${ultimo.x} ${ultimo.y}`;
  return d;
}

function pathAreaSuave(pontos) {
  if (pontos.length === 0) return "";
  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];
  return `${pathLinhaSuave(pontos)} L ${ultimo.x} ${GRAFICO_PICO_ALTURA} L ${primeiro.x} ${GRAFICO_PICO_ALTURA} Z`;
}

export default function PainelAoVivo({
  eventosIniciais = [],
  visitasLoginIniciais = [],
  resultadosLogin = [],
  clientes = [],
  idsAdmins = [],
  erroContas = false,
}) {
  const router = useRouter();
  const [atualizando, iniciarAtualizacao] = useTransition();
  const [eventos, setEventos] = useState(() =>
    eventosIniciais.map((e) => ({ ...e, criado_em: new Date(e.criado_em) }))
  );
  const [visitasLogin, setVisitasLogin] = useState(() =>
    visitasLoginIniciais.map((v) => ({ ...v, criado_em: new Date(v.criado_em) }))
  );
  const [contasLive, setContasLive] = useState([]);
  const [agora, setAgora] = useState(() => new Date());
  const [horaSelecionada, setHoraSelecionada] = useState(null);

  // router.refresh() traz um retrato novo do servidor. Como estes dados
  // ficam em estado local para receber o Realtime, sincronizamos as novas
  // propriedades quando a atualização manual terminar.
  useEffect(() => {
    setEventos(eventosIniciais.map((e) => ({ ...e, criado_em: new Date(e.criado_em) })));
  }, [eventosIniciais]);

  useEffect(() => {
    setVisitasLogin(visitasLoginIniciais.map((v) => ({ ...v, criado_em: new Date(v.criado_em) })));
  }, [visitasLoginIniciais]);

  function atualizarDados() {
    iniciarAtualizacao(() => {
      router.refresh();
      setAgora(new Date());
    });
  }

  // Relógio próprio: mesmo sem nenhuma visita nova chegando, os números por
  // tempo (tipo "agora" e a virada do dia) precisam continuar corretos.
  useEffect(() => {
    const intervalo = setInterval(() => setAgora(new Date()), 20000);
    return () => clearInterval(intervalo);
  }, []);

  // Ao vivo de verdade: toda visita nova de qualquer cliente chega aqui na
  // hora, sem precisar dar refresh na página.
  useEffect(() => {
    const idsAdminsSet = new Set(idsAdmins);
    const supabase = createClient();
    const canal = supabase
      .channel("painel-ao-vivo")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "eventos_visita" },
        ({ new: novo }) => {
          if (idsAdminsSet.has(novo.user_id)) return;
          setEventos((atuais) => [...atuais, { ...novo, criado_em: new Date(novo.criado_em) }]);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "perfis_usuario" },
        ({ new: novo }) => {
          if (idsAdminsSet.has(novo.user_id)) return;
          setContasLive((atuais) => [...atuais, { id: novo.user_id, criadoEmIso: novo.primeiro_login }]);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "visitas_login" },
        ({ new: novo }) => {
          setVisitasLogin((atuais) => [...atuais, { ...novo, criado_em: new Date(novo.criado_em) }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dados = useMemo(() => {
    const hojeBR = diaDeData(agora);
    const chaveHoje = chaveDia(hojeBR);
    const chaveOntem = chaveDia(somaDias(hojeBR, -1));

    const diasDesdeSegunda = (diaDaSemana(hojeBR) + 6) % 7;
    const chaveInicioSemana = chaveDia(somaDias(hojeBR, -diasDesdeSegunda));
    const chaveInicioMes = chaveDia({ ano: hojeBR.ano, mes: hojeBR.mes, dia: 1 });

    const eventosComChave = eventos.map((e) => ({ ...e, chaveDia: chaveDia(diaDeData(e.criado_em)) }));

    function agregarPeriodo(filtro) {
      const doPeriodo = eventosComChave.filter(filtro);
      return { visitas: doPeriodo.length, usuarios: new Set(doPeriodo.map((e) => e.user_id)).size };
    }

    const hoje = agregarPeriodo((e) => e.chaveDia === chaveHoje);
    const ontem = agregarPeriodo((e) => e.chaveDia === chaveOntem);
    const semana = agregarPeriodo((e) => e.chaveDia >= chaveInicioSemana && e.chaveDia <= chaveHoje);
    const mes = agregarPeriodo((e) => e.chaveDia >= chaveInicioMes && e.chaveDia <= chaveHoje);

    const limiteAgora = new Date(agora.getTime() - JANELA_AGORA_MIN * 60000);
    const agoraCount = new Set(
      eventos.filter((e) => e.criado_em >= limiteAgora).map((e) => e.user_id)
    ).size;

    const chaveInicio30 = chaveDia(somaDias(hojeBR, -(JANELA_ENGAJAMENTO_DIAS - 1)));
    const eventos30 = eventosComChave.filter((e) => e.chaveDia >= chaveInicio30);

    const contagemRotas = new Map();
    eventos30.forEach((e) => contagemRotas.set(e.rota, (contagemRotas.get(e.rota) || 0) + 1));
    const topRotas = [...contagemRotas.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([rota, total]) => ({ rota, rotulo: rotuloRota(rota), total }));
    const maxRota = Math.max(1, ...topRotas.map((r) => r.total));

    const contagemHora = new Array(24).fill(0);
    eventos30.forEach((e) => {
      contagemHora[partesBR(e.criado_em).hora] += 1;
    });
    const maxHora = Math.max(1, ...contagemHora);
    const horaPico = contagemHora.indexOf(Math.max(...contagemHora));

    const diasPorUsuario = new Map();
    eventos30.forEach((e) => {
      if (!diasPorUsuario.has(e.user_id)) diasPorUsuario.set(e.user_id, new Set());
      diasPorUsuario.get(e.user_id).add(e.chaveDia);
    });
    const contagemDiasAtivos = new Map();
    let somaDiasAtivos = 0;
    diasPorUsuario.forEach((dias) => {
      const n = dias.size;
      contagemDiasAtivos.set(n, (contagemDiasAtivos.get(n) || 0) + 1);
      somaDiasAtivos += n;
    });
    const usuariosAtivos30 = diasPorUsuario.size;
    const mediaDiasAtivos = usuariosAtivos30 > 0 ? somaDiasAtivos / usuariosAtivos30 : 0;
    const bucketsEngajamento = [...contagemDiasAtivos.entries()].sort((a, b) => a[0] - b[0]).slice(0, 15);
    const maxBucket = Math.max(1, ...bucketsEngajamento.map(([, q]) => q));

    const idsVistos = new Set();
    const contasComChave = [];
    [...clientes.map((c) => ({ id: c.id, criadoEmIso: c.criadoEmIso })), ...contasLive].forEach((c) => {
      if (!c.criadoEmIso || idsVistos.has(c.id)) return;
      idsVistos.add(c.id);
      contasComChave.push({ chaveDia: chaveDia(diaDeData(new Date(c.criadoEmIso))) });
    });
    function contarContas(filtro) {
      return contasComChave.filter(filtro).length;
    }
    const contasNovas = {
      hoje: contarContas((c) => c.chaveDia === chaveHoje),
      ontem: contarContas((c) => c.chaveDia === chaveOntem),
      semana: contarContas((c) => c.chaveDia >= chaveInicioSemana && c.chaveDia <= chaveHoje),
      mes: contarContas((c) => c.chaveDia >= chaveInicioMes && c.chaveDia <= chaveHoje),
    };

    // Cada navegador recebe um identificador anônimo. Assim várias aberturas
    // da tela pela mesma pessoa contam como uma única visita no período.
    const visitasLoginComChave = visitasLogin.map((v) => ({
      visitanteId: v.visitante_id,
      chaveDia: chaveDia(diaDeData(v.criado_em)),
      ip: v.ip || null,
    }));
    const resultadosComChave = resultadosLogin.map((r) => ({
      ...r,
      chaveDia: chaveDia(diaDeData(new Date(r.criado_em))),
    }));

    // Um resultado gravado para o mesmo visitante prova que ele terminou o
    // formulário e ficou vinculado a uma conta. Para registros anteriores a
    // essa medição, o IP conhecido de uma conta é usado como aproximação.
    const ipsDeContas = new Set(eventos.map((e) => e.ip).filter(Boolean));
    function calcularFunilLogin(filtro) {
      const concluidos = new Set(
        resultadosComChave.filter(filtro).map((r) => r.visitante_id)
      );
      const porVisitante = new Map();
      visitasLoginComChave.filter(filtro).forEach((v) => {
        const jaTemConta = porVisitante.get(v.visitanteId) || concluidos.has(v.visitanteId);
        porVisitante.set(
          v.visitanteId,
          jaTemConta || (!!v.ip && ipsDeContas.has(v.ip))
        );
      });
      let visitasComConta = 0;
      let visitasSemCriarConta = 0;
      porVisitante.forEach((temConta) => {
        if (temConta) visitasComConta += 1;
        else visitasSemCriarConta += 1;
      });
      return {
        total: porVisitante.size,
        visitasComConta,
        visitasSemCriarConta,
      };
    }
    const funilLogin = {
      hoje: calcularFunilLogin((v) => v.chaveDia === chaveHoje),
      ontem: calcularFunilLogin((v) => v.chaveDia === chaveOntem),
      semana: calcularFunilLogin((v) => v.chaveDia >= chaveInicioSemana && v.chaveDia <= chaveHoje),
      mes: calcularFunilLogin((v) => v.chaveDia >= chaveInicioMes && v.chaveDia <= chaveHoje),
    };

    return {
      agoraCount,
      hoje,
      ontem,
      semana,
      mes,
      contasNovas,
      topRotas,
      maxRota,
      contagemHora,
      maxHora,
      horaPico,
      temEventos30: eventos30.length > 0,
      bucketsEngajamento,
      maxBucket,
      mediaDiasAtivos,
      usuariosAtivos30,
      funilLogin,
      temVisitasLogin: visitasLogin.length > 0,
    };
  }, [eventos, contasLive, clientes, visitasLogin, resultadosLogin, agora]);

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={atualizarDados}
          disabled={atualizando}
          className="btn-secondary"
        >
          <RefreshCw size={15} className={atualizando ? "animate-spin" : ""} />
          {atualizando ? "Atualizando..." : "Atualizar dados"}
        </button>
      </div>

      <div className="mb-6 flex items-center gap-2.5 rounded-sm bg-amber p-4">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ink/50" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-ink" />
        </span>
        <p className="text-sm text-ink">
          <span className="font-extrabold">{dados.agoraCount}</span>{" "}
          {dados.agoraCount === 1 ? "pessoa navegando agora" : "pessoas navegando agora"}
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <CartaoPeriodo titulo="Hoje" dado={dados.hoje} />
        <CartaoPeriodo titulo="Ontem" dado={dados.ontem} />
        <CartaoPeriodo titulo="Na semana" dado={dados.semana} />
        <CartaoPeriodo titulo="No mês" dado={dados.mes} />
      </div>

      <p className="mb-2 text-xs text-muted">Contas novas</p>
      {erroContas ? (
        <p className="mb-6 text-xs text-muted">
          Falta ativar a chave de administração do Supabase no servidor pra contar contas novas.
        </p>
      ) : (
        <div className="mb-6 grid grid-cols-4 gap-2">
          <MiniStat titulo="Hoje" valor={dados.contasNovas.hoje} />
          <MiniStat titulo="Ontem" valor={dados.contasNovas.ontem} />
          <MiniStat titulo="Semana" valor={dados.contasNovas.semana} />
          <MiniStat titulo="Mês" valor={dados.contasNovas.mes} />
        </div>
      )}

      <p className="mb-2 text-xs text-muted">Visitas à tela de login</p>
      {!dados.temVisitasLogin ? (
        <p className="mb-6 text-xs text-muted">
          Ainda sem visitas registradas nessa tela (só conta a partir de agora).
        </p>
      ) : (
        <>
          <div className="mb-4 grid grid-cols-4 gap-2">
            <MiniStat titulo="Hoje" valor={dados.funilLogin.hoje.total} />
            <MiniStat titulo="Ontem" valor={dados.funilLogin.ontem.total} />
            <MiniStat titulo="Semana" valor={dados.funilLogin.semana.total} />
            <MiniStat titulo="Mês" valor={dados.funilLogin.mes.total} />
          </div>
          <p className="mb-4 text-[10px] text-muted">
            Cada navegador conta uma vez por período, mesmo que abra a tela várias vezes.
          </p>

          <p className="mb-2 text-xs text-muted">
            Visitas que já têm conta
          </p>
          <div className="mb-4 grid grid-cols-4 gap-2">
            <MiniStat titulo="Hoje" valor={dados.funilLogin.hoje.visitasComConta} />
            <MiniStat titulo="Ontem" valor={dados.funilLogin.ontem.visitasComConta} />
            <MiniStat titulo="Semana" valor={dados.funilLogin.semana.visitasComConta} />
            <MiniStat titulo="Mês" valor={dados.funilLogin.mes.visitasComConta} />
          </div>

          <p className="mb-2 text-xs text-muted">Visitas que saíram sem criar conta</p>
          <div className="mb-2 grid grid-cols-4 gap-2">
            <MiniStat titulo="Hoje" valor={dados.funilLogin.hoje.visitasSemCriarConta} />
            <MiniStat titulo="Ontem" valor={dados.funilLogin.ontem.visitasSemCriarConta} />
            <MiniStat titulo="Semana" valor={dados.funilLogin.semana.visitasSemCriarConta} />
            <MiniStat titulo="Mês" valor={dados.funilLogin.mes.visitasSemCriarConta} />
          </div>
          <p className="mb-6 text-[10px] text-muted">
            Visitas com conta + visitas que saíram sem criar = total de visitas à tela. A vinculação
            passa a ser registrada diretamente; dados antigos continuam usando a aproximação por IP.
          </p>
        </>
      )}

      <p className="mb-2 text-xs text-muted">Abas mais visitadas (últimos 30 dias)</p>
      <div className="mb-6 flex flex-col gap-2 rounded-sm border border-border bg-surface p-3">
        {dados.topRotas.length === 0 ? (
          <p className="text-sm text-muted">Ainda sem visitas registradas.</p>
        ) : (
          dados.topRotas.map((r, i) => (
            <div key={r.rota} className="flex items-center gap-2">
              <span className="w-4 shrink-0 text-[10px] text-muted">{i + 1}</span>
              <span className="w-20 shrink-0 truncate text-xs text-ink" title={r.rotulo}>
                {r.rotulo}
              </span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface2">
                <div
                  className="h-full rounded-full bg-amber"
                  style={{ width: `${(r.total / dados.maxRota) * 100}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right text-[10px] text-muted">{r.total}</span>
            </div>
          ))
        )}
      </div>

      <p className="mb-2 text-xs text-muted">Horário de pico (últimos 30 dias)</p>
      <div className="mb-6 rounded-sm border border-border bg-surface p-3">
        {dados.temEventos30 ? (
          <>
            {(() => {
              const horaFoco = horaSelecionada ?? dados.horaPico;
              const qtdFoco = dados.contagemHora[horaFoco] || 0;
              const pontos = pontosGraficoPico(dados.contagemHora);
              const pontoFoco = pontos[horaFoco];
              const colunaLargura = GRAFICO_PICO_LARGURA / dados.contagemHora.length;
              return (
                <>
                  <p className="mb-2 text-sm text-ink">
                    {horaSelecionada === null ? "Pico às " : "às "}
                    <span className="font-extrabold">{String(horaFoco).padStart(2, "0")}h</span>
                    {" — "}
                    <span className="font-extrabold">{qtdFoco}</span>{" "}
                    {qtdFoco === 1 ? "acesso" : "acessos"}
                  </p>
                  <svg
                    viewBox={`0 0 ${GRAFICO_PICO_LARGURA} ${GRAFICO_PICO_ALTURA}`}
                    preserveAspectRatio="none"
                    className="h-20 w-full touch-none"
                  >
                    <defs>
                      <linearGradient id="graficoPicoGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#C6F136" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#C6F136" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {[0, 6, 12, 18, 23].map((h) => (
                      <line
                        key={h}
                        x1={pontos[h]?.x}
                        x2={pontos[h]?.x}
                        y1={0}
                        y2={GRAFICO_PICO_ALTURA}
                        stroke="#E2E1D3"
                        strokeWidth="1"
                        strokeDasharray="3 3"
                      />
                    ))}
                    <path d={pathAreaSuave(pontos)} fill="url(#graficoPicoGlow)" stroke="none" />
                    <path
                      d={pathLinhaSuave(pontos)}
                      fill="none"
                      stroke="#4F6B3F"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {pontoFoco && (
                      <circle cx={pontoFoco.x} cy={pontoFoco.y} r="4.5" fill="#C6F136" stroke="#FFFFFF" strokeWidth="2.5" />
                    )}
                    {dados.contagemHora.map((_, h) => (
                      <rect
                        key={h}
                        x={h * colunaLargura}
                        y="0"
                        width={colunaLargura}
                        height={GRAFICO_PICO_ALTURA}
                        fill="transparent"
                        className="cursor-pointer"
                        onClick={() => setHoraSelecionada((atual) => (atual === h ? null : h))}
                      >
                        <title>{`${h}h: ${dados.contagemHora[h]}`}</title>
                      </rect>
                    ))}
                  </svg>
                </>
              );
            })()}
            <div className="mt-1 flex justify-between text-[9px] text-muted">
              <span>0h</span>
              <span>6h</span>
              <span>12h</span>
              <span>18h</span>
              <span>23h</span>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">Ainda sem visitas suficientes.</p>
        )}
      </div>

      <p className="mb-2 text-xs text-muted">Engajamento real (últimos 30 dias)</p>
      <div className="rounded-sm border border-border bg-surface p-3">
        {dados.usuariosAtivos30 === 0 ? (
          <p className="text-sm text-muted">Ainda sem dados suficientes.</p>
        ) : (
          <>
            <p className="mb-3 text-sm leading-relaxed text-ink">
              Em média, quem usa o app de verdade acessa em{" "}
              <span className="font-extrabold">{dados.mediaDiasAtivos.toFixed(1)}</span> dos últimos 30 dias
              ({dados.usuariosAtivos30} {dados.usuariosAtivos30 === 1 ? "cliente" : "clientes"} com pelo menos
              1 acesso nesse período)
            </p>
            <div className="flex flex-col gap-1.5">
              {dados.bucketsEngajamento.map(([dias, qtd]) => (
                <div key={dias} className="flex items-center gap-2">
                  <span className="w-16 shrink-0 text-xs text-ink">
                    {dias} {dias === 1 ? "dia" : "dias"}
                  </span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface2">
                    <div
                      className="h-full rounded-full bg-olive"
                      style={{ width: `${(qtd / dados.maxBucket) * 100}%` }}
                    />
                  </div>
                  <span className="w-20 shrink-0 text-right text-[10px] text-muted">
                    {qtd} {qtd === 1 ? "cliente" : "clientes"}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function CartaoPeriodo({ titulo, dado }) {
  return (
    <div className="rounded-sm border border-border bg-surface p-3">
      <p className="mb-1 text-[10px] text-muted">{titulo}</p>
      <p className="font-extrabold tracking-tight text-xl text-ink">{dado.visitas}</p>
      <p className="text-[10px] text-muted">
        {dado.visitas === 1 ? "visita" : "visitas"} · {dado.usuarios} {dado.usuarios === 1 ? "cliente" : "clientes"}
      </p>
    </div>
  );
}

function MiniStat({ titulo, valor }) {
  return (
    <div className="rounded-sm border border-border bg-surface p-2.5 text-center">
      <p className="font-extrabold text-lg text-ink">{valor}</p>
      <p className="text-[10px] text-muted">{titulo}</p>
    </div>
  );
}
