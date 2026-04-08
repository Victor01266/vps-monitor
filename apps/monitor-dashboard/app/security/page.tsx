"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { useCallback, useMemo } from "react";
import { usePolling } from "@/hooks/usePolling";
import { fetchAttacks, fetchFail2BanStatus } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { Shield, ShieldAlert, Users } from "lucide-react";

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

export default function SecurityPage() {
  const attacksFetcher = useCallback(() => fetchAttacks(1000) as Promise<AttacksData>, []);
  const fail2banFetcher = useCallback(() => fetchFail2BanStatus() as Promise<Fail2banData>, []);

  const { data: attacksData } = usePolling(attacksFetcher, 20000);
  const { data: fail2banData } = usePolling(fail2banFetcher, 30000);

  const attacks = useMemo(() => attacksData?.attacks ?? [], [attacksData?.attacks]);
  const acceptedLogins = useMemo(() => attacksData?.accepted_logins ?? [], [attacksData?.accepted_logins]);
  
  const activeBans = useMemo(
    () => (fail2banData?.jails ?? []).reduce((sum, jail) => sum + jail.currently_banned, 0),
    [fail2banData?.jails]
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">Segurança</h2>
            <p className="text-sm text-[#AEB9E1] mt-1">Eventos de SSH, Fail2Ban e histórico de logins recentes.</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#0B1739] border border-[#343B4F] rounded-lg px-3 py-2">
              <ShieldAlert className="w-4 h-4 text-[#CB3CFF]" />
              <div>
                <p className="text-[10px] text-[#AEB9E1] uppercase tracking-wider">Ataques nas 24h</p>
                <p className="text-sm font-bold text-white leading-none">{attacksData?.total_attacks ?? 0}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-[#0B1739] border border-[#343B4F] rounded-lg px-3 py-2">
              <Shield className="w-4 h-4 text-[#14CA74]" />
              <div>
                <p className="text-[10px] text-[#AEB9E1] uppercase tracking-wider">Bans Ativos</p>
                <p className="text-sm font-bold text-white leading-none">{activeBans}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Logins com Sucesso */}
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
                    <tr>
                      <td colSpan={3} className="text-center py-6 text-[#AEB9E1]">Nenhum login recente com sucesso.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Ataques e Falhas */}
          <div className="rounded-xl bg-[#0B1739] border border-[#343B4F] p-4 flex flex-col h-[380px]">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#FF3B3B]" />
                <h3 className="text-base font-medium">Tentativas de Ataque/Falhas</h3>
              </div>
              <Badge variant="danger">Journald</Badge>
            </div>

            <div className="flex-1 overflow-auto bg-[#0A1330] rounded-lg border border-[#343B4F]">
              <table className="w-full text-xs min-w-[400px]">
                <thead>
                  <tr className="border-b border-[#343B4F]">
                    <th className="text-left py-2 px-3 text-[#AEB9E1] uppercase tracking-wider text-[10px]">Data</th>
                    <th className="text-left py-2 px-3 text-[#AEB9E1] uppercase tracking-wider text-[10px]">Motivo</th>
                    <th className="text-left py-2 px-3 text-[#AEB9E1] uppercase tracking-wider text-[10px]">IP Origem</th>
                  </tr>
                </thead>
                <tbody>
                  {attacks.slice(-50).reverse().map((attack, idx) => (
                    <tr key={`${attack.timestamp}-${idx}`} className="border-b border-[#343B4F] last:border-0 hover:bg-[#081028]">
                      <td className="py-2 px-3 text-[#AEB9E1] whitespace-nowrap">{sanitizeText(attack.timestamp)}</td>
                      <td className="py-2 px-3 text-white">
                        {attack.type === "brute_force" ? "Brute force" : "Invalid user"}
                      </td>
                      <td className="py-2 px-3 font-mono text-[#FF3B3B]">{sanitizeText(attack.ip)}</td>
                    </tr>
                  ))}
                  {attacks.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center py-6 text-[#AEB9E1]">Sem tentativas recentes de ataque.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Top Atacantes */}
        <div className="rounded-xl bg-[#0B1739] border border-[#343B4F] p-4">
          <h3 className="text-base font-medium mb-4">Top 10 IPs Ofensores</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {attacksData?.top_attackers?.slice(0, 10).map((attacker, idx) => {
              const maxAttempts = attacksData.top_attackers[0]?.attempts ?? 1;
              const width = Math.max(10, (attacker.attempts / maxAttempts) * 100);
              
              return (
                <div key={attacker.ip} className="rounded-lg bg-[#0A1330] border border-[#343B4F] p-3 flex flex-col">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] text-[#AEB9E1]">Rank #{idx + 1}</p>
                    <p className="text-xs text-white font-bold">{attacker.attempts} pts</p>
                  </div>
                  <p className="font-mono text-xs text-[#FF3B3B] truncate mb-2">{sanitizeText(attacker.ip)}</p>
                  <div className="h-1 rounded-full bg-[#081028] overflow-hidden mt-auto">
                    <div
                      className="h-full bg-linear-to-r from-[#CB3CFF] to-[#FF3B3B]"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
            
            {(!attacksData?.top_attackers || attacksData.top_attackers.length === 0) && (
              <div className="col-span-full py-8 text-center text-[#AEB9E1] border border-dashed border-[#343B4F] rounded-lg">
                Nenhum IP ofensor mapeado até o momento.
              </div>
            )}
          </div>
        </div>

      </div>
    </MainLayout>
  );
}
