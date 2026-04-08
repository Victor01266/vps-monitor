"use client";

import { useState, useCallback, useEffect } from "react";
import { Shield, Swords } from "lucide-react";
import { usePolling } from "@/hooks/usePolling";
import { fetchAttacks, fetchFirewallRules } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { AttackMap } from "@/components/events/AttackMap";

interface GeoInfo {
  ip: string;
  country: string;
  countryCode: string;
  city: string;
  isp: string;
  attempts: number;
  lat: number;
  lon: number;
}

function sanitizeText(val: unknown, fallback = ""): string {
  if (typeof val !== "string") return fallback;
  return val.replace(/[<>"'`]/g, "").trim() || fallback;
}

export default function EventsPage() {
  const [tab, setTab] = useState<"events" | "attackers">("events");
  const [geoData, setGeoData] = useState<GeoInfo[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);

  const attacksFetcher = useCallback(
    () => fetchAttacks() as Promise<{ attacks: { timestamp: string; type: string; user: string; ip: string }[]; top_attackers: { ip: string; attempts: number }[]; total_attacks: number }>,
    []
  );
  const firewallFetcher = useCallback(
    () => fetchFirewallRules() as Promise<{ rules: { target: string; source: string }[] }>,
    []
  );

  const { data: attacksData } = usePolling(attacksFetcher, 20000);
  const { data: firewallData } = usePolling(firewallFetcher, 30000);

  const recentEvents = attacksData?.attacks ?? [];
  const topAttackers = (attacksData?.top_attackers ?? []);
  const blockedSet = new Set(
    (firewallData?.rules ?? [])
      .filter((r) => r.target === "DROP")
      .map((r) => r.source)
  );

  // Resolve geolocalização dos top attackers via ip-api.com batch
  useEffect(() => {
    if (!topAttackers.length) return;
    const ips = topAttackers.slice(0, 10).map((a) => a.ip);
    setGeoLoading(true);
    fetch("http://ip-api.com/batch?fields=query,country,countryCode,city,isp,lat,lon,status", {
      method: "POST",
      body: JSON.stringify(ips.map((ip) => ({ query: ip }))),
    })
      .then((r) => r.json())
      .then((results: { query: string; country: string; countryCode: string; city: string; isp: string; lat: number; lon: number; status: string }[]) => {
        setGeoData(
          results
            .filter((r) => r.status === "success")
            .map((r) => ({
              ip: r.query,
              country: r.country ?? "—",
              countryCode: (r.countryCode ?? "").toLowerCase(),
              city: r.city ?? "—",
              isp: r.isp ?? "—",
              lat: r.lat ?? 0,
              lon: r.lon ?? 0,
              attempts: topAttackers.find((a) => a.ip === r.query)?.attempts ?? 0,
            }))
        );
      })
      .catch(() => setGeoData([]))
      .finally(() => setGeoLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attacksData]);

  return (
    <div className="space-y-4 p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-white flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#CB3CFF]" />
          Eventos de Segurança
        </h1>
        <p className="text-xs text-[#AEB9E1] mt-0.5">
          {attacksData?.total_attacks ?? 0} tentativas nas últimas 24h
        </p>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-[#343B4F] overflow-hidden" style={{ background: "#0B1739" }}>
        <div className="flex items-center border-b border-[#343B4F] overflow-x-auto scrollbar-hide">
          {(["events", "attackers"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-xs font-medium transition-colors border-b-2 flex items-center gap-2 ${
                tab === t
                  ? "text-white border-[#CB3CFF] bg-[#0A1330]"
                  : "text-[#AEB9E1] border-transparent hover:text-white"
              }`}
            >
              {t === "events" ? (
                <><Shield className="w-3.5 h-3.5" />Recent Security Events</>
              ) : (
                <><Swords className="w-3.5 h-3.5" />Top Attacking IPs</>
              )}
            </button>
          ))}
          <div className="flex-1" />
          <p className="text-[10px] text-[#AEB9E1] px-4">
            {new Date().toLocaleDateString("pt-BR")}
          </p>
        </div>

        {tab === "events" ? (
          <div className="overflow-auto p-4">
            <table className="w-full text-xs min-w-[600px]">
              <thead>
                <tr className="border-b border-[#343B4F]">
                  <th className="text-left py-2 pr-3 text-[#AEB9E1] uppercase tracking-wider text-[10px]">Data/Hora</th>
                  <th className="text-left py-2 pr-3 text-[#AEB9E1] uppercase tracking-wider text-[10px]">Tipo</th>
                  <th className="text-left py-2 pr-3 text-[#AEB9E1] uppercase tracking-wider text-[10px]">Usuário</th>
                  <th className="text-left py-2 pr-3 text-[#AEB9E1] uppercase tracking-wider text-[10px]">IP</th>
                  <th className="text-left py-2 text-[#AEB9E1] uppercase tracking-wider text-[10px]">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((event, idx) => {
                  const ip = sanitizeText(event.ip, "unknown");
                  const blocked = blockedSet.has(ip);
                  const isAccepted = event.type === "accepted";
                  const typeLabel =
                    event.type === "brute_force" ? "Brute force"
                    : event.type === "invalid_user" ? "Invalid user"
                    : "Login aceito";
                  return (
                    <tr
                      key={`${event.timestamp}-${idx}`}
                      className={`border-b border-[#343B4F]/60 transition-colors ${
                        isAccepted ? "hover:bg-emerald-500/5" : "hover:bg-red-500/5"
                      }`}
                    >
                      <td className="py-2 pr-3 text-[#AEB9E1] font-mono text-[11px]">
                        {sanitizeText(event.timestamp).replace("T", " ")}
                      </td>
                      <td className="py-2 pr-3">
                        <span className={isAccepted ? "text-emerald-400" : "text-amber-400"}>
                          {typeLabel}
                        </span>
                      </td>
                      <td className="py-2 pr-3 font-mono text-[#AEB9E1]">{sanitizeText(event.user, "—")}</td>
                      <td className="py-2 pr-3 font-mono text-white">{ip}</td>
                      <td className="py-2">
                        {isAccepted ? (
                          <Badge variant="success">Aceito</Badge>
                        ) : blocked ? (
                          <Badge variant="danger">Bloqueado</Badge>
                        ) : (
                          <Badge variant="warning">Pendente</Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {recentEvents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-[#AEB9E1]">
                      Sem eventos recentes
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {topAttackers.map((attacker, idx) => {
              const maxAttempts = topAttackers[0]?.attempts ?? 1;
              const width = Math.max(10, (attacker.attempts / maxAttempts) * 100);
              return (
                <div key={attacker.ip} className="rounded-lg bg-[#0A1330] border border-[#343B4F] p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-[#AEB9E1]">#{idx + 1}</p>
                    <p className="text-sm text-white font-medium">{attacker.attempts} tentativas</p>
                  </div>
                  <p className="font-mono text-xs text-white truncate mb-2">
                    {sanitizeText(attacker.ip)}
                  </p>
                  <div className="h-1.5 rounded-full bg-[#081028] overflow-hidden">
                    <div
                      className="h-full bg-linear-to-r from-[#CB3CFF] to-[#00C2FF]"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {topAttackers.length === 0 && (
              <p className="text-sm text-[#AEB9E1] text-center py-8">Sem dados de atacantes</p>
            )}
          </div>
        )}
      </div>

      {/* Attack Map Card */}
      <AttackMap geoData={geoData} geoLoading={geoLoading} />
    </div>
  );
}
