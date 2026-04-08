"use client";
import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Lock, Unlock, RefreshCw } from "lucide-react";
import { fail2banUnban } from "@/lib/api";

interface Jail {
  jail: string;
  total_banned: number;
  currently_banned: number;
  banned_ips: string[];
}

interface Fail2BanPanelProps {
  jails: Jail[];
  onRefresh?: () => void;
  onToast?: (msg: string, ok: boolean) => void;
}

export function Fail2BanPanel({ jails, onRefresh, onToast }: Fail2BanPanelProps) {
  const [unbanning, setUnbanning] = useState<string | null>(null);

  async function handleUnban(jail: string, ip: string) {
    const key = `${jail}:${ip}`;
    setUnbanning(key);
    try {
      await fail2banUnban(jail, ip);
      onToast?.(`✓ IP ${ip} desbanido do jail ${jail}.`, true);
      onRefresh?.();
    } catch (e) {
      onToast?.(`✗ ${e instanceof Error ? e.message : "Falha ao desbanir"}`, false);
    } finally {
      setUnbanning(null);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Lock className="w-4 h-4 text-[#CB3CFF]" />
          Fail2Ban · Jails
          <span className="ml-1 bg-[#CB3CFF]/20 text-[#CB3CFF] text-[10px] px-2 py-0.5 rounded-full font-mono border border-[#CB3CFF]/25">
            {jails.length}
          </span>
        </CardTitle>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="text-[10px] text-[#AEB9E1] hover:text-white transition-colors p-1 rounded bg-[#0A1330] border border-[#343B4F]"
            title="Atualizar"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        )}
      </CardHeader>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {jails.map((j) => {
          const pct = j.total_banned > 0 ? Math.min(100, (j.currently_banned / j.total_banned) * 100) : 0;
          return (
            <div
              key={j.jail}
              className={`rounded-lg p-3 border transition-colors ${
                j.currently_banned > 0
                  ? "bg-red-500/8 border-red-500/20"
                  : "bg-[#0A1330] border-[#343B4F]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono font-semibold text-white">{j.jail}</span>
                <Badge variant={j.currently_banned > 0 ? "danger" : "muted"}>
                  {j.currently_banned} ban
                </Badge>
              </div>
              <div className="flex gap-3 text-[10px] text-[#AEB9E1] mb-2">
                <span>Total: <span className="text-white font-mono">{j.total_banned}</span></span>
                <span>Ativo: <span className={j.currently_banned > 0 ? "text-red-400 font-mono" : "text-[#AEB9E1]"}>{j.currently_banned}</span></span>
              </div>
              {j.total_banned > 0 && (
                <div className="usage-bar mb-2">
                  <div
                    className="usage-bar-fill"
                    style={{ width: `${pct}%`, background: j.currently_banned > 0 ? "#ef4444" : "#06b6d4" }}
                  />
                </div>
              )}
              {j.banned_ips.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {j.banned_ips.slice(0, 4).map((ip) => {
                    const key = `${j.jail}:${ip}`;
                    const isLoading = unbanning === key;
                    return (
                      <button
                        key={ip}
                        onClick={() => handleUnban(j.jail, ip)}
                        disabled={isLoading}
                        title={`Desbanir ${ip} do jail ${j.jail}`}
                        className="group flex items-center gap-1 font-mono text-[10px] text-red-400 bg-red-500/10 hover:bg-amber-500/15 hover:text-amber-300 px-1.5 py-0.5 rounded transition-colors disabled:opacity-50"
                      >
                        {isLoading ? (
                          <span className="animate-spin inline-block">⟳</span>
                        ) : (
                          <Unlock className="w-2.5 h-2.5 hidden group-hover:inline-block" />
                        )}
                        <span className={isLoading ? "hidden" : ""}>{ip}</span>
                      </button>
                    );
                  })}
                  {j.banned_ips.length > 4 && (
                    <span className="text-[10px] text-[#AEB9E1] px-1">+{j.banned_ips.length - 4}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {jails.length === 0 && (
          <p className="col-span-4 text-center text-[#AEB9E1] text-sm py-4">Nenhum jail ativo</p>
        )}
      </div>
    </Card>
  );
}
