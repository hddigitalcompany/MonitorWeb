"use client";

import Link from "next/link";
import { ABAS } from "@/components/DashboardChrome";

export default function AtalhosInicio({ novosPorHref = {} }) {
  const atalhos = ABAS.filter((a) => a.href !== "/dashboard/inicio");

  return (
    <div>
      <p className="mb-2 text-xs text-muted">Acesso rápido</p>
      <div className="grid grid-cols-2 gap-2">
        {atalhos.map(({ href, label, icon: Icon }) => {
          const novos = novosPorHref[href] || 0;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-start gap-2.5 rounded-sm border border-border bg-surface p-3"
            >
              <span className="relative flex h-9 w-9 items-center justify-center rounded-full bg-amber">
                <Icon size={16} className="text-ink" strokeWidth={2} />
                {novos > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-ink px-1 text-[9px] font-bold text-base">
                    {novos}
                  </span>
                )}
              </span>
              <span className="text-xs text-ink">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
