"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Camera } from "lucide-react";

export default function PerfilModal({ aberto, aoFechar, user, aoAtualizar }) {
  const [nome, setNome] = useState(user.user_metadata?.full_name || "");
  const [avatarUrl, setAvatarUrl] = useState(user.user_metadata?.avatar_url || "");
  const [status, setStatus] = useState("");
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const supabase = createClient();

  if (!aberto) return null;

  async function salvarNome() {
    if (!nome.trim()) {
      setStatus("erro:Digite um nome.");
      return;
    }
    const { error } = await supabase.auth.updateUser({
      data: { full_name: nome.trim() },
    });
    setStatus(error ? "erro:Não deu pra salvar." : "ok:Nome atualizado.");
    if (!error) aoAtualizar?.();
    setTimeout(() => setStatus(""), 2000);
  }

  async function trocarFoto(e) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setEnviandoFoto(true);

    const caminho = `${user.id}/${Date.now()}-${arquivo.name}`;
    const { error: erroUpload } = await supabase.storage
      .from("avatares")
      .upload(caminho, arquivo, { upsert: true });

    if (!erroUpload) {
      const {
        data: { publicUrl },
      } = supabase.storage.from("avatares").getPublicUrl(caminho);
      await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
      setAvatarUrl(publicUrl);
      aoAtualizar?.();
    }
    setEnviandoFoto(false);
    e.target.value = "";
  }

  const [tipo, mensagem] = status.split(":");

  return (
    <div
      className="fixed inset-0 z-30 flex items-end bg-black/55"
      onClick={(e) => e.target === e.currentTarget && aoFechar()}
    >
      <div className="w-full max-w-md rounded-t-xl border-t border-border bg-surface px-5 pb-6 pt-5">
        <div className="mb-4 flex items-center justify-between">
          <p className="font-extrabold tracking-tight text-lg text-ink">Meu perfil</p>
          <button onClick={aoFechar} aria-label="Fechar" className="text-muted">
            <X size={19} />
          </button>
        </div>

        <div className="mb-5 flex flex-col items-center gap-2">
          <div className="relative">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-16 w-16 rounded-full border border-border object-cover" />
            ) : (
              <div className="h-16 w-16 rounded-full bg-amber" />
            )}
            <label className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-border bg-surface text-ink">
              <Camera size={12} />
              <input type="file" accept="image/*" onChange={trocarFoto} disabled={enviandoFoto} className="hidden" />
            </label>
          </div>
          <label className="cursor-pointer text-xs text-amber">
            {enviandoFoto ? "Enviando..." : "Alterar foto"}
            <input type="file" accept="image/*" onChange={trocarFoto} disabled={enviandoFoto} className="hidden" />
          </label>
        </div>

        <div className="flex flex-col gap-3 border-t border-border pt-3">
          <div>
            <p className="field-label">Nome</p>
            <div className="flex gap-2">
              <input value={nome} onChange={(e) => setNome(e.target.value)} className="field-input" />
              <button onClick={salvarNome} className="btn-primary shrink-0 px-3 py-0 text-xs">
                Salvar
              </button>
            </div>
            {status && (
              <p className={`mt-1 text-xs ${tipo === "erro" ? "text-rust" : "text-olive"}`}>{mensagem}</p>
            )}
          </div>
          <div>
            <p className="field-label">Sua conta foi criada com o email:</p>
            <p className="text-sm text-ink">{user.email}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
