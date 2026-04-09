"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { useCallback, useState } from "react";
import { usePolling } from "@/hooks/usePolling";
import { fetchUFWRules, addUFWRule, deleteUFWRule } from "@/lib/api";
import {
  ShieldCheck, ShieldOff, Plus, Trash2,
  RefreshCw, Shield, Search, ArrowRight, ArrowLeft,
  ArrowLeftRight, Copy, Check, Layers,
} from "lucide-react";

interface UFWRule {
  num: number;
  to: string;
  action: "ALLOW" | "DENY" | "REJECT" | "LIMIT";
  direction: string;
  from: string;
}

interface UFWData {
  status: string;
  rules: UFWRule[];
  total: number;
}

type RuleFilter = "all" | "allow" | "deny";

const ACTION_META: Record<string, { color: string; bg: string; border: string; Icon: React.ElementType; label: string; title: string }> = {
  ALLOW:  { color: "#10b981", bg: "rgba(16,185,129,0.12)",  border: "rgba(16,185,129,0.30)",  Icon: ShieldCheck, label: "Permitir",  title: "Libera o tráfego"  },
  DENY:   { color: "#ef4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.30)",   Icon: ShieldOff,   label: "Negar",    title: "Bloqueia silenciosamente" },
  REJECT: { color: "#ef4444", bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.30)",   Icon: ShieldOff,   label: "Rejeitar", title: "Bloqueia com resposta" },
  LIMIT:  { color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  border: "rgba(245,158,11,0.30)",  Icon: Shield,      label: "Limitar",  title: "Limita conexões" },
};

const ADD_ACTION_META = {
  deny:   { color: "#ef4444", label: "Negar",    title: "Bloqueia silenciosamente" },
  allow:  { color: "#10b981", label: "Permitir",  title: "Libera o tráfego" },
  reject: { color: "#ef4444", label: "Rejeitar", title: "Bloqueia com resposta" },
};

function DirectionBadge({ direction }: { direction: string }) {
  const d = direction.toUpperCase();
  if (d.includes("IN") && d.includes("OUT")) return (
    <span className="inline-flex items-center gap-1.5 font-data text-[10px] font-semibold" style={{ color: "#00c2ff" }}>
      <ArrowLeftRight size={11} />
      <span title="Entrada e Saída">Entrada/Saída</span>
    </span>
  );
  if (d.includes("IN")) return (
    <span className="inline-flex items-center gap-1.5 font-data text-[10px] font-semibold" style={{ color: "#00c2ff" }}>
      <ArrowRight size={11} />
      <span title="Tráfego chegando">Entrada</span>
    </span>
  );
  if (d.includes("OUT")) return (
    <span className="inline-flex items-center gap-1.5 font-data text-[10px] font-semibold" style={{ color: "#8b5cf6" }}>
      <ArrowLeft size={11} />
      <span title="Tráfego saindo">Saída</span>
    </span>
  );
  return <span className="font-data text-[10px]" style={{ color: "var(--foreground-muted)" }}>{direction}</span>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <button
      onClick={handleCopy}
      title="Copiar"
      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded ml-1"
      style={{ color: copied ? "#10b981" : "var(--foreground-muted)" }}
    >
      {copied ? <Check size={10} /> : <Copy size={10} />}
    </button>
  );
}

const FILTERS: { id: RuleFilter; label: string }[] = [
  { id: "all",   label: "Todas" },
  { id: "allow", label: "Permitir" },
  { id: "deny",  label: "Bloquear" },
];

export default function FirewallPage() {
  const ufwFetcher = useCallback(() => fetchUFWRules() as Promise<UFWData>, []);
  const { data: ufwData, loading, refetch } = usePolling(ufwFetcher, 30000);

  const [newTarget, setNewTarget] = useState("");
  const [newAction, setNewAction] = useState<"allow" | "deny" | "reject">("deny");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deletingNum, setDeletingNum] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [ruleFilter, setRuleFilter] = useState<RuleFilter>("all");

  const handleAdd = async () => {
    if (!newTarget.trim()) return;
    setAdding(true);
    setAddError(null);
    try {
      await addUFWRule(newTarget.trim(), newAction);
      setNewTarget("");
      refetch();
    } catch (e: unknown) {
      setAddError(e instanceof Error ? e.message : "Erro ao adicionar regra");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (num: number) => {
    if (confirmDelete !== num) { setConfirmDelete(num); return; }
    setDeletingNum(num);
    setConfirmDelete(null);
    try {
      await deleteUFWRule(num);
      refetch();
    } finally {
      setDeletingNum(null);
    }
  };

  const rules = ufwData?.rules ?? [];
  const totalCount = rules.length;
  const allowCount = rules.filter((r) => r.action === "ALLOW").length;
  const denyCount  = rules.filter((r) => r.action === "DENY" || r.action === "REJECT").length;
  const limitCount = rules.filter((r) => r.action === "LIMIT").length;

  const filtered = rules.filter((r) => {
    const matchFilter =
      ruleFilter === "all" ? true :
      ruleFilter === "allow" ? r.action === "ALLOW" :
      r.action === "DENY" || r.action === "REJECT";
    if (!matchFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return r.to.toLowerCase().includes(q) || r.from.toLowerCase().includes(q);
  });

  const isActive = ufwData?.status === "active";
  const filterCounts: Record<RuleFilter, number> = { all: totalCount, allow: allowCount, deny: denyCount };

  const summaryStats = [
    { label: "Total", value: totalCount, color: "#AEB9E1", Icon: Layers },
    { label: "Permitir", value: allowCount, color: "#10b981", Icon: ShieldCheck },
    { label: "Bloquear", value: denyCount,   color: "#ef4444", Icon: ShieldOff  },
    { label: "Limitar", value: limitCount, color: "#f59e0b", Icon: Shield     },
  ];

  return (
    <MainLayout>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 20 }}>

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4 flex-wrap" style={{ flexShrink: 0 }}>
          <div>
            <h2 className="text-2xl font-semibold text-white">Firewall</h2>
            <p className="text-sm mt-1 flex items-center gap-2" style={{ color: "var(--foreground-muted)" }}>
              Regras UFW —
              <span className="inline-flex items-center gap-1.5">
                <span
                  className={isActive ? "pulse-dot" : ""}
                  style={{ width: 6, height: 6, borderRadius: "50%", display: "inline-block", background: isActive ? "#10b981" : "#f59e0b" }}
                />
                <span style={{ color: isActive ? "#10b981" : "#f59e0b", fontWeight: 600 }}>
                  {ufwData?.status ?? "carregando..."}
                </span>
              </span>
            </p>
          </div>
          <button
            onClick={() => refetch()}
            disabled={loading}
            aria-label="Atualizar regras"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer disabled:opacity-50"
            style={{ background: "rgba(203,60,255,0.10)", border: "1px solid rgba(203,60,255,0.25)", color: "var(--accent)" }}
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Atualizar
          </button>
        </div>

        {/* ── Stats ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" style={{ flexShrink: 0 }}>
          {summaryStats.map(({ label, value, color, Icon }, i) => (
            <div
              key={label}
              className="stat-enter"
              style={{
                animationDelay: `${i * 0.07}s`,
                background: "var(--surface)",
                border: "1px solid #343B4F",
                borderRadius: "var(--radius)",
                padding: "14px 18px",
                display: "flex", alignItems: "center", gap: 11,
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 9, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", background: `${color}18` }}>
                <Icon size={17} color={color} />
              </div>
              <div>
                <p className="font-data text-xl font-bold" style={{ color, lineHeight: 1 }}>
                  {loading && !ufwData ? "—" : value}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "var(--foreground-muted)" }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Add rule form ───────────────────────────────────── */}
        <div
          style={{ flexShrink: 0, background: "var(--surface)", border: "1px solid #343B4F", borderRadius: "var(--radius)", padding: "16px 20px" }}
        >
          <p className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <Plus size={15} style={{ color: "var(--accent)" }} />
            Nova regra
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="IP (ex: 203.0.113.0) ou porta (ex: 22/tcp)"
              className="flex-1 text-sm text-white placeholder-[#AEB9E1]/40 focus:outline-none transition-colors font-data"
              style={{
                background: "var(--surface-2)", border: "1px solid #343B4F",
                borderRadius: 8, padding: "8px 12px",
              }}
              onFocus={(e) => { (e.target as HTMLInputElement).style.borderColor = "rgba(203,60,255,0.5)"; }}
              onBlur={(e) => { (e.target as HTMLInputElement).style.borderColor = "#343B4F"; }}
            />
            <div style={{ display: "flex", gap: 8 }}>
              {(["deny", "allow", "reject"] as const).map((a) => {
                const m = ADD_ACTION_META[a];
                const sel = newAction === a;
                return (
                  <button
                    key={a}
                    onClick={() => setNewAction(a)}
                    className="px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                    title={m.title}
                    style={{
                      background: sel ? `${m.color}20` : "var(--surface-2)",
                      border: `1px solid ${sel ? m.color + "60" : "#343B4F"}`,
                      color: sel ? m.color : "var(--foreground-muted)",
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
            <button
              onClick={handleAdd}
              disabled={adding || !newTarget.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "rgba(203,60,255,0.15)", border: "1px solid rgba(203,60,255,0.35)", color: "var(--accent)" }}
            >
              <Plus size={14} />
              {adding ? "Adicionando..." : "Adicionar"}
            </button>
          </div>
          {addError && <p className="text-xs mt-2" style={{ color: "var(--danger)" }}>{addError}</p>}
        </div>

        {/* ── Filters + search ────────────────────────────────── */}
        <div className="flex items-center gap-3 flex-wrap" style={{ flexShrink: 0 }}>
          {FILTERS.map(({ id, label }) => {
            const active = ruleFilter === id;
            return (
              <button
                key={id}
                onClick={() => setRuleFilter(id)}
                className="px-4 py-1.5 rounded-full text-sm font-medium transition-all cursor-pointer"
                style={{
                  background: active ? "linear-gradient(135deg,#cb3cff 20%,#7f25fb 68%)" : "transparent",
                  border: "1px solid",
                  borderColor: active ? "transparent" : "#343B4F",
                  color: active ? "#fff" : "var(--foreground-muted)",
                  boxShadow: active ? "0 0 14px rgba(203,60,255,0.30)" : "none",
                }}
              >
                {label}
                <span className="ml-1.5 font-data text-xs" style={{ opacity: active ? 0.8 : 0.5 }}>
                  ({filterCounts[id]})
                </span>
              </button>
            );
          })}

          <div className="ml-auto flex items-center gap-2" style={{ background: "var(--surface)", border: "1px solid #343B4F", borderRadius: 8, padding: "6px 12px" }}>
            <Search size={13} style={{ color: "var(--foreground-muted)", flexShrink: 0 }} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="IP ou porta..."
              className="bg-transparent text-xs text-white placeholder-[#AEB9E1]/40 focus:outline-none font-data w-40"
            />
          </div>
        </div>

        {/* ── Scrollable table ────────────────────────────────── */}
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto", borderRadius: "var(--radius)", border: "1px solid #343B4F" }}>
          {loading && !ufwData ? (
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="fade-in" style={{ animationDelay: `${i * 0.06}s`, height: 44, borderRadius: 8, background: "#1e2a4a40" }} />
              ))}
            </div>
          ) : (
            <table className="w-full text-sm" style={{ minWidth: 600 }}>
              <thead style={{ position: "sticky", top: 0, zIndex: 2, background: "var(--surface-2)" }}>
                <tr style={{ borderBottom: "1px solid #343B4F" }}>
                  <th className="text-left py-3 px-4 font-data text-xs uppercase tracking-wider" style={{ color: "var(--foreground-muted)", width: 40 }}>#</th>
                  <th className="text-left py-3 px-4 font-data text-xs uppercase tracking-wider" style={{ color: "var(--foreground-muted)" }}>Destino</th>
                  <th className="text-left py-3 px-4 font-data text-xs uppercase tracking-wider" style={{ color: "var(--foreground-muted)" }}>Origem</th>
                  <th className="text-center py-3 px-4 font-data text-xs uppercase tracking-wider" style={{ color: "var(--foreground-muted)", width: 100 }}>Direção</th>
                  <th className="text-center py-3 px-4 font-data text-xs uppercase tracking-wider" style={{ color: "var(--foreground-muted)", width: 110 }}>Ação</th>
                  <th className="py-3 px-4" style={{ width: 120 }} />
                </tr>
              </thead>
              <tbody style={{ background: "var(--surface)" }}>
                {filtered.map((rule) => {
                  const meta = ACTION_META[rule.action] ?? ACTION_META.LIMIT;
                  return (
                    <tr
                      key={rule.num}
                      className="group transition-colors"
                      style={{ borderBottom: "1px solid #343B4F18" }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = `${meta.color}08`; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = ""; }}
                    >
                      {/* Left accent stripe */}
                      <td className="py-3 px-4 relative font-data text-xs" style={{ color: "var(--foreground-muted)" }}>
                        <span
                          style={{
                            position: "absolute", left: 0, top: 6, bottom: 6,
                            width: 3, borderRadius: "0 2px 2px 0",
                            background: meta.color, opacity: 0.7,
                          }}
                        />
                        {rule.num}
                      </td>
                      <td className="py-3 px-4 font-data text-xs text-white">
                        <span className="inline-flex items-center">
                          {rule.to}
                          <CopyButton text={rule.to} />
                        </span>
                      </td>
                      <td className="py-3 px-4 font-data text-xs" style={{ color: "var(--foreground-muted)" }}>
                        <span className="inline-flex items-center">
                          {rule.from}
                          <CopyButton text={rule.from} />
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <DirectionBadge direction={rule.direction} />
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className="inline-flex items-center gap-1.5 font-data text-xs font-semibold"
                          title={meta.title}
                          style={{
                            background: meta.bg, border: `1px solid ${meta.border}`,
                            borderRadius: 20, padding: "3px 9px", color: meta.color,
                          }}
                        >
                          <meta.Icon size={10} />
                          {meta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {confirmDelete === rule.num ? (
                          <div className="flex items-center justify-end gap-2">
                            <span className="text-xs" style={{ color: "#f59e0b" }}>Confirmar?</span>
                            <button
                              onClick={() => handleDelete(rule.num)}
                              disabled={deletingNum === rule.num}
                              className="px-2 py-1 rounded text-xs transition-colors disabled:opacity-40 cursor-pointer"
                              style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.30)" }}
                            >
                              Sim
                            </button>
                            <button
                              onClick={() => setConfirmDelete(null)}
                              className="px-2 py-1 rounded text-xs transition-colors cursor-pointer"
                              style={{ background: "var(--surface-2)", color: "var(--foreground-muted)", border: "1px solid #343B4F" }}
                            >
                              Não
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDelete(rule.num)}
                            disabled={deletingNum === rule.num}
                            className="p-1.5 rounded transition-colors disabled:opacity-40 cursor-pointer opacity-0 group-hover:opacity-100"
                            style={{ color: "var(--foreground-muted)" }}
                            title="Remover regra"
                            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.10)"; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--foreground-muted)"; (e.currentTarget as HTMLButtonElement).style.background = ""; }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-sm" style={{ color: "var(--foreground-muted)" }}>
                      {!ufwData ? "Carregando regras..." : search ? `Nenhuma regra encontrada para "${search}".` : "Nenhuma regra UFW encontrada."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Footer count ────────────────────────────────────── */}
        {filtered.length > 0 && (
          <div style={{ flexShrink: 0, textAlign: "right" }}>
            <span className="font-data text-xs" style={{ color: "var(--foreground-muted)" }}>
              {filtered.length} de {totalCount} regra{totalCount !== 1 ? "s" : ""}
            </span>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
