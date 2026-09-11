// Avisos do tipo "fulano entrou na conversa" — um selo centralizado, sem
// balão, igual mensagem de sistema de chat de verdade (não é uma fala nem
// da pessoa nem do bot).
export default function TagSistema({ texto }) {
  return (
    <div className="flex justify-center py-1">
      <span className="rounded-full bg-surface2 px-3 py-1 text-center text-[11px] text-muted">
        {texto}
      </span>
    </div>
  );
}
