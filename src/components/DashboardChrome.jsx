"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PerfilModal from "@/components/PerfilModal";
import { formatarTelefone } from "@/lib/telefone";
import {
  Menu,
  Home,
  Image as ImageIcon,
  MapPin,
  Phone,
  Search,
  Wifi,
  MessageCircle,
  BookUser,
  UserCircle,
  Headset,
  CreditCard,
  LogOut,
} from "lucide-react";

export const ABAS = [
  { href: "/dashboard/inicio", label: "Início", icon: Home },
  { href: "/dashboard/fotos", label: "Fotos", icon: ImageIcon },
  { href: "/dashboard/locais-seguros", label: "Local", icon: MapPin },
  { href: "/dashboard/lembretes", label: "Lembretes", icon: Phone },
  { href: "/dashboard/links-ajuda", label: "Links", icon: Search },
  { href: "/dashboard/wifi", label: "Wifi", icon: Wifi },
  { href: "/dashboard/conversas", label: "Conversas", icon: MessageCircle },
  { href: "/dashboard/contatos", label: "Contatos", icon: BookUser },
];

export function DashboardChrome({ user, telefone, children }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const [perfilAberto, setPerfilAberto] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function sair() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="mx-auto flex h-dvh max-w-md flex-col">
      <header className="flex shrink-0 items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <button
          onClick={() => setMenuAberto(true)}
          aria-label="Abrir menu"
          className="p-1 text-ink"
        >
          <Menu size={21} strokeWidth={1.75} />
        </button>
        <p className="font-extrabold tracking-tight text-lg text-ink">📍 {formatarTelefone(telefone)}</p>
      </header>

      <main className="flex-1 overflow-y-auto px-4 py-5">{children}</main>

      <BottomNav />

      {menuAberto && (
        <div
          className="fixed inset-0 z-20 bg-black/50"
          onClick={(e) => e.target === e.currentTarget && setMenuAberto(false)}
        >
          <div className="flex h-full w-60 flex-col border-r border-border bg-surface p-4">
            <div className="mb-3 flex items-center gap-2 border-b border-border pb-4">
              {user.user_metadata?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.user_metadata.avatar_url}
                  alt=""
                  className="h-8 w-8 rounded-full border border-border object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-amber" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm text-ink">{user.user_metadata?.full_name || "Você"}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
            </div>

            <button
              onClick={() => {
                setMenuAberto(false);
                setPerfilAberto(true);
              }}
              className="flex items-center gap-2.5 rounded-sm px-2 py-2.5 text-left text-sm text-ink hover:bg-surface2"
            >
              <UserCircle size={17} className="text-muted" strokeWidth={1.75} />
              Meu perfil
            </button>
            <Link
              href="/dashboard/suporte"
              onClick={() => setMenuAberto(false)}
              className="flex items-center gap-2.5 rounded-sm px-2 py-2.5 text-sm text-ink hover:bg-surface2"
            >
              <Headset size={17} className="text-muted" strokeWidth={1.75} />
              Suporte
            </Link>
            <Link
              href="/dashboard/assinatura"
              onClick={() => setMenuAberto(false)}
              className="flex items-center gap-2.5 rounded-sm px-2 py-2.5 text-sm text-ink hover:bg-surface2"
            >
              <CreditCard size={17} className="text-muted" strokeWidth={1.75} />
              Assinatura
            </Link>

            <div className="flex-1" />

            <button
              onClick={sair}
              className="flex items-center gap-2.5 rounded-sm border-t border-border px-2 py-2.5 pt-3.5 text-left text-sm text-rust"
            >
              <LogOut size={17} strokeWidth={1.75} />
              Sair da conta
            </button>
          </div>
        </div>
      )}

      <PerfilModal
        aberto={perfilAberto}
        aoFechar={() => setPerfilAberto(false)}
        user={user}
        aoAtualizar={() => router.refresh()}
      />
    </div>
  );
}

function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="flex shrink-0 gap-1 overflow-x-auto border-t border-border bg-surface px-2 py-2">
      {ABAS.map(({ href, label, icon: Icon }) => {
        const ativo = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            className={`flex min-w-[56px] flex-1 flex-col items-center gap-1 rounded-md py-2 text-[10px] transition-colors ${
              ativo ? "bg-ink text-base" : "text-muted"
            }`}
          >
            <Icon size={18} strokeWidth={1.75} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
