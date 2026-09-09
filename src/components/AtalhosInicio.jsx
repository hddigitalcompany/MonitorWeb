"use client";

import Link from "next/link";
import { ABAS } from "@/components/DashboardChrome";

export default function AtalhosInicio() {
  const atalhos = ABAS.filter((a) => a.href !== "/dashboard/inicio");

  return (
    <div>
      <p className="mb-2 text-xs text-muted">Acesso rápido</p>
      <div className="grid grid-cols-2 gap-2">
        {atalhos.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex flex-col items-start gap-2 rounded-sm border border-border bg-surface p-3"
          >
            <Icon size={18} className="text-amber" strokeWidth={1.75} />
            <span className="text-xs text-ink">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
