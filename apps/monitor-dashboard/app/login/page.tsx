"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const redirected = useRef(false);

  useEffect(() => {
    if (!redirected.current && document.cookie.includes("monitor_token=")) {
      redirected.current = true;
      router.replace("/");
    }
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const apiBase = window.location.origin;
      const res = await fetch(`${apiBase}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? "Credenciais inválidas");
      }
      const { token, expires_in } = await res.json();
      const expires = new Date(Date.now() + expires_in * 1000).toUTCString();
      document.cookie = `monitor_token=${token}; path=/; expires=${expires}; SameSite=Lax`;
      router.replace("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erro ao conectar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#060b18] relative overflow-hidden">
      {/* Fundo animado */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-[#cb3cff]/10 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[#00c2ff]/8 blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#7f25fb]/5 blur-[160px]" />
        {/* Grid sutil */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: "linear-gradient(#aeb9e1 1px, transparent 1px), linear-gradient(90deg, #aeb9e1 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative w-full max-w-sm mx-4">
        {/* Card */}
        <div
          className="rounded-2xl border border-[#343B4F] p-8"
          style={{
            background: "linear-gradient(160deg, #0d1b3e 0%, #0b1739 60%, #081028 100%)",
            boxShadow: "0 0 0 1px rgba(203,60,255,0.08), 0 32px 64px rgba(0,0,0,0.5), 0 0 80px rgba(203,60,255,0.06)",
          }}
        >
          {/* Logo / Icon */}
          <div className="flex flex-col items-center mb-8">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{
                background: "linear-gradient(135deg, #cb3cff 0%, #7f25fb 100%)",
                boxShadow: "0 8px 32px rgba(203,60,255,0.4)",
              }}
            >
              <ShieldCheck className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight">VPS Monitor</h1>
            <p className="text-sm text-[#AEB9E1] mt-1">Diagonal TI — Acesso Restrito</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[#AEB9E1] mb-1.5 uppercase tracking-wider">
                Usuário
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                required
                placeholder="admin"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-[#4a5578] outline-none transition-all duration-200"
                style={{
                  background: "#081028",
                  border: "1px solid #343B4F",
                }}
                onFocus={(e) => (e.currentTarget.style.border = "1px solid rgba(203,60,255,0.5)")}
                onBlur={(e) => (e.currentTarget.style.border = "1px solid #343B4F")}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-[#AEB9E1] mb-1.5 uppercase tracking-wider">
                Senha
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  placeholder="••••••••"
                  className="w-full px-4 py-3 pr-11 rounded-xl text-sm text-white placeholder-[#4a5578] outline-none transition-all duration-200"
                  style={{
                    background: "#081028",
                    border: "1px solid #343B4F",
                  }}
                  onFocus={(e) => (e.currentTarget.style.border = "1px solid rgba(203,60,255,0.5)")}
                  onBlur={(e) => (e.currentTarget.style.border = "1px solid #343B4F")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#AEB9E1] hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 mt-2"
              style={{
                background: loading
                  ? "#2d1f4a"
                  : "linear-gradient(135deg, #cb3cff 0%, #7f25fb 100%)",
                boxShadow: loading ? "none" : "0 4px 24px rgba(203,60,255,0.35)",
              }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                "Entrar"
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-[10px] text-[#4a5578] mt-6 uppercase tracking-widest">
            Acesso monitorado · Uso interno
          </p>
        </div>
      </div>
    </div>
  );
}
