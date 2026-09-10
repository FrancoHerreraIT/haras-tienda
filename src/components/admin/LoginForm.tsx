"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Loader2, Lock, Mail } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    /* redirect:false para manejar el error sin salir de la pagina. */
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (!result || result.error || !result.ok) {
      setError("Email o contrasena incorrectos.");
      setLoading(false);
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div>
        <label
          htmlFor="email"
          className="block text-[11px] font-semibold tracking-wide text-stone-500 mb-2"
        >
          Email
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="dueno@harasdeleste.com"
            className="w-full rounded-lg border border-stone-300 bg-white py-3 pl-10 pr-4 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#8B5A2B] focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/20 transition-colors"
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="password"
          className="block text-[11px] font-semibold tracking-wide text-stone-500 mb-2"
        >
          Contrasena
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-stone-300 bg-white py-3 pl-10 pr-4 text-sm text-stone-800 placeholder:text-stone-400 focus:border-[#8B5A2B] focus:outline-none focus:ring-2 focus:ring-[#8B5A2B]/20 transition-colors"
          />
        </div>
      </div>

      {error && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 rounded-lg bg-[#1C1A19] py-3.5 text-sm font-semibold tracking-wide text-stone-50 hover:bg-[#8B5A2B] disabled:opacity-60 disabled:hover:bg-[#1C1A19] transition-colors"
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {loading ? "Verificando..." : "Ingresar al Panel"}
      </button>
    </form>
  );
}
