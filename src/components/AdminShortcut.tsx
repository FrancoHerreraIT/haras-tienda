"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

/**
 * Atajo al backoffice para la vidriera publica.
 *
 * Solo aparece si YA hay una sesion de admin abierta: no es una puerta de
 * login, es un pasaje de vuelta. Un visitante anonimo nunca lo ve.
 *
 * La sesion se consulta en el cliente a proposito: leerla en el servidor
 * obligaria a renderizar el home en cada request y perderiamos el prerender.
 */
export default function AdminShortcut() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/session")
      .then((res) => (res.ok ? res.json() : null))
      .then((session) => {
        if (!cancelled) setIsAdmin(session?.user?.role === "ADMIN");
      })
      .catch(() => {
        /* Sin sesion o sin red: el atajo simplemente no se muestra. */
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isAdmin) return null;

  return (
    <Link
      href="/admin"
      className="flex items-center gap-2 rounded-full border border-[#8B5A2B] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-100 transition-colors hover:bg-[#8B5A2B]"
    >
      <LayoutDashboard className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Panel</span>
    </Link>
  );
}
