import { formatarHora } from "@/lib/tempo";

export default function ChatBolha({ de, texto, destaque = false, hora }) {
  const propria = de === "usuario";
  return (
    <div className={`flex flex-col ${propria ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[85%] rounded-sm px-3 py-2 text-sm leading-relaxed ${
          propria ? "bg-amber text-ink" : "border border-border bg-surface text-ink"
        } ${destaque ? "font-semibold" : ""}`}
      >
        {texto}
        {!propria && texto === "" && <span className="opacity-0">.</span>}
      </div>
      {hora && <span className="mt-1 px-1 text-[10px] text-muted">{formatarHora(hora)}</span>}
    </div>
  );
}
