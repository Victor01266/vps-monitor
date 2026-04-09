"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { useCallback, useMemo, useState } from "react";
import { usePolling } from "@/hooks/usePolling";
import { fetchAttacks, fetchFail2BanStatus, fetchAttacksCount, fetchTopAttackersAll } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Shield, ShieldAlert, Users, Clock, History } from "lucide-react";

interface Attack {
  type: "brute_force" | "invalid_user" | "accepted";
  timestamp: string;
  user?: string;
  ip?: string;
  source?: string;
}

interface AttacksData {
  total_attacks: number;
  attacks: Attack[];
  accepted_logins?: Attack[];
  top_attackers: { ip: string; attempts: number }[];
}

interface Fail2banData {
  jails: { jail: string; total_banned: number; currently_banned: number; banned_ips: string[] }[];
}

function sanitizeText(value?: string, fallback = "—") {
  if (!value) return fallback;
  return value.replace(/[<>"'%;()&+]/g, "").slice(0, 120);
}

function parseTimestamp(ts: string): Date | null {
  if (!ts || ts === "—") return null;
  if (/^\d{4}-\d{2}-\d{2}T/.test(ts)) {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  }
  const m = ts.match(/^([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{2}:\d{2}:\d{2})/);
  if (m) {
    const d = new Date(`${m[1]} ${m[2].padStart(2, "0")} ${new Date().getFullYear()} ${m[3]}`);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function isWithin24h(ts: string): boolean {
  const parsed = parseTimestamp(ts);
  if (!parsed) return false;
  return Date.now() - parsed.getTime() < 86_400_000;
}

function TopAttackerCard({ attacker, idx, max }: { attacker: { ip: string; attempts: number }; idx: number; max: number }) {
  const width = Math.max(6, (attacker.attempts / max) * 100);
  return (
    <div className="rounded-lg bg-[#0A1330] border border-[#343B4F] p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-[#AEB9E1] font-data">#{idx + 1}</span>
        <span className="text-xs text-white font-bold font-data">{attacker.attempts.toLocaleString()}</span>
      </div>
      <p className="font-mono text-xs text-[#FF3B3B] truncate">{sanitizeText(attacker.ip)}</p>
      <div className="h-1 rounded-full bg-[#081028] overflow-hidden mt-auto">
        <div className="h-full bg-linear-to-r from-[#CB3CFF] to-[#FF3B3B]" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export default function SecurityPage() {
  const attacksFetcher  = useCallback(() => fetchAttacks(1000) as Promise<AttacksData>, []);
  const fail2banFetcher = useCallback(() => fetchFail2BanStatus() as Promise<Fail2banData>, []);
  const countFetcher    = useCallback(() => fetchAttacksCount(), []);
  const topAllFetcher   = useCallback(() => fetchTopAttackersAll(10), []);

  const { data: attacksData  } = usePolling(attacksFetcher,  20000);
  const { data: fail2banData } = usePolling(fail2banFetcher, 30000);
  const { data: countData    } = usePolling(countFetcher,   300000);
  const { data: topAllData   } = usePolling(topAllFetcher,  300000);

  const [topTab,    setTopTab]    = useState<"recent" | "all">("recent");
  const [attackTab, setAttackTab] = useState<"all" | "24h">("all");

  const attacks       = useMemo(() => attacksData?.attacks ?? [], [attacksData?.attacks]);
  const acceptedLogins = useMemo(() => attacksData?.accepted_logins ?? [], [attacksData?.accepted_logins]);
  const attacks24h    = useMemo(() => attacks.filter(a => isWithin24h(a.timestamp)), [attacks]);
  const displayAttacks = useMemo(
    () => (attackTab === "24h" ? attacks24h : attacks).slice().reverse(),
    [attackTab, attacks, attacks24h]
  );

  const activeBans = useMemo(
    () => (fail2banData?.jails ?? []).reduce((sum, j) => sum + j.currently_banned, 0),
    [fail2banData?.jails]
  );

  const recentTop = attacksData?.top_attackers ?? [];
  const allTop    = topAllData?.top_attackers   ?? [];
  const activeTop = topTab === "recent" ? recentTop : allTop;
  const maxAttempts = activeTop[0]?.attempts ?? 1;

  return (
    <MainLayout>
      <div className="space-y-6">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">Segurança</h2>
            <p className="text-sm text-[#AEB9E1] mt-1">Eventos de SSH, Fail2Ban e histórico de logins recentes.</p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* Total histórico */}
            <div className="flex items-center gap-2 bg-[#0B1739] border border-[#343B4F] rounded-lg px-3 py-2">
              <History className="w-4 h-4 text-[#CB3CFF]" />
              <div>
                <p className="text-[10px] text-[#AEB9E1] uppercase tracking-wider">Total histórico</p>
                <p className="text-sm font-bold text-white leading-none font-data">
                  {countData?.total != null ? countData.total.toLocaleString() : "—"}
                </p>
              </div>
            </div>
            {/* Últimas 24h */}
            <div className="flex items-center gap-2 bg-[#0B1739] border border-[#343B4F] rounded-lg px-3 py-2">
              <Clock className="w-4 h-4 text-[#f59e0b]" />
              <div>
                <p className="text-[10px] text-[#AEB9E1] uppercase tracking-wider">Últimas 24h</p>
                <p className="text-sm font-bold text-white leading-none font-data">
                  {attacksData ? attacks24h.length : "—"}
                </p>
              </div>
            </div>
            {/* Bans ativos */}
            <div className="flex items-center gap-2 bg-[#0B1739] border border-[#343B4F] rounded-lg px-3 py-2">
              <Shield className="w-4 h-4 text-[#14CA74]" />
              <div>
                <p className="text-[10px] text-[#AEB9E1] uppercase tracking-wider">Bans Ativos</p>
                <p className="text-sm font-bold text-white leading-none font-data">{activeBans}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Grid 2 colunas ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

          {/* Logins com sucesso */}
          <div className="rounded-xl bg-[#0B1739] border border-[#343B4F] p-4 flex flex-col h-[380px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#00C2FF]" />
                <h3 className="text-base font-medium">Logins Válidos Recentes (SSH)</h3>
              </div>
              <Badge variant="success">Journald</Badge>
            </div>
            <div className="flex-1 overflow-auto bg-[#0A1330] rounded-lg border border-[#343B4F]">
              <table className="w-full text-xs min-w-[400px]">
                <thead>
                  <tr className="border-b border-[#343B4F]">
                    <th className="text-left py-2 px-3 text-[#AEB9E1] uppercase tracking-wider text-[10px]">Data</th>
                    <th className="text-left py-2 px-3 text-[#AEB9E1] uppercase tracking-wider text-[10px]">Usuário</th>
                    <th className="text-left py-2 px-3 text-[#AEB9E1] uppercase tracking-wider text-[10px]">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {acceptedLogins.map((login, idx) => (
                    <tr key={`${login.timestamp}-${idx}`} className="border-b border-[#343B4F] last:border-0 hover:bg-[#081028]">
                      <td className="py-2 px-3 text-[#AEB9E1] whitespace-nowrap">{sanitizeText(login.timestamp)}</td>
                      <td className="py-2 px-3 text-white font-medium">{sanitizeText(login.user)}</td>
                      <td className="py-2 px-3 font-mono text-[#00C2FF]">{sanitizeText(login.ip)}</td>
                    </tr>
                  ))}
                  {acceptedLogins.length === 0 && (
                    <tr><td colSpan={3} className="text-center py-6 text-[#AEB9E1]">Nenhum login recente com sucesso.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tentativas de ataque */}
          <div className="rounded-xl bg-[#0B1739] border border-[#343B4F] p-4 flex flex-col h-[380px]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#FF3B3B]" />
                <h3 className="text-base font-medium">Tentativas de Ataque</h3>
              </div>
              <Badge variant="danger">Journald</Badge>
            </div>

            {/* tabs filtro */}
            <div className="flex items-center gap-2 mb-3" style={{ flexShrink: 0 }}>
              {(["all", "24h"] as const).map((tab) => {
                const labels = { all: `Todas (${attacks.length})`, "24h": `Últimas 24h (${attacks24h.length})` };
                const active = attackTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setAttackTab(tab)}
                    className="px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer"
                    style={{
                      background: active ? "linear-gradient(135deg,#cb3cff 20%,#7f25fb 68%)" : "transparent",
                      border: "1px solid",
                      borderColor: active ? "transparent" : "#343B4F",
                      color: active ? "#fff" : "#AEB9E1",
                      boxShadow: active ? "0 0 12px rgba(203,60,255,0.25)" : "none",
                    }}
                  >
                    {labels[tab]}
                  </button>
                );
              })}
            </div>

            <div className="flex-1 overflow-auto bg-[#0A1330] rounded-lg border border-[#343B4F]">
              <table className="w-full text-xs min-w-[400px]">
                <thead>
                  <tr className="border-b border-[#343B4F]">
                    <th className="text-left py-2 px-3 text-[#AEB9E1] uppercase tracking-wider text-[10px]">Data</th>
                    <th className="text-left py-2 px-3 text-[#AEB9E1] uppercase tracking-wider text-[10px]">Tipo</th>
                    <th className="text-left py-2 px-3 text-[#AEB9E1] uppercase tracking-wider text-[10px]">IP Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {displayAttacks.map((attack, idx) => (
                    <tr key={`${attack.timestamp}-${idx}`} className="border-b border-[#343B4F] last:border-0 hover:bg-[#081028]">
                      <td className="py-2 px-3 text-[#AEB9E1] whitespace-nowrap">{sanitizeText(attack.timestamp)}</td>
                      <td className="py-2 px-3 text-white">
                        {attack.type === "brute_force" ? "Força bruta" : "Usuário inválido"}
                      </td>
                      <td className="py-2 px-3 font-mono text-[#FF3B3B]">{sanitizeText(attack.ip)}</td>
                    </tr>
                  ))}
                  {displayAttacks.length === 0 && (
                    <tr><td colSpan={3} className="text-center py-6 text-[#AEB9E1]">
                      {attackTab === "24h" ? "Nenhuma tentativa nas últimas 24h." : "Sem tentativas registradas."}
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── Top 10 IPs Ofensores ────────────────────────────────── */}
        <div className="rounded-xl bg-[#0B1739] border border-[#343B4F] p-4">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h3 className="text-base font-medium">Top 10 IPs Ofensores</h3>
            {/* tabs */}
            <div className="flex items-center gap-2">
              {([
                { id: "recent" as const, label: "Recentes", icon: Clock },
                { id: "all"    as const, label: "Todo o período", icon: History },
              ]).map(({ id, label, icon: Icon }) => {
                const active = topTab === id;
                return (
                  <button
                    key={id}
                    onClick={() => setTopTab(id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer"
                    style={{
                      background: active ? "linear-gradient(135deg,#cb3cff 20%,#7f25fb 68%)" : "transparent",
                      border: "1px solid",
                      borderColor: active ? "transparent" : "#343B4F",
                      color: active ? "#fff" : "#AEB9E1",
                      boxShadow: active ? "0 0 12px rgba(203,60,255,0.25)" : "none",
                    }}
                  >
                    <Icon size={11} />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {topTab === "all" && (
            <p className="text-[11px] text-[#AEB9E1] mb-3 opacity-70">
              Contagem acumulada de todos os logs históricos disponíveis (auth.log atual + rotacionados).
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {activeTop.slice(0, 10).map((attacker, idx) => (
              <TopAttackerCard key={`${topTab}-${attacker.ip}`} attacker={attacker} idx={idx} max={maxAttempts} />
            ))}
            {activeTop.length === 0 && (
              <div className="col-span-full py-8 text-center text-[#AEB9E1] border border-dashed border-[#343B4F] rounded-lg">
                {topTab === "all" ? "Carregando histórico…" : "Nenhum IP ofensor mapeado até o momento."}
              </div>
            )}
          </div>
        </div>

      </div>
    </MainLayout>
  );
}
