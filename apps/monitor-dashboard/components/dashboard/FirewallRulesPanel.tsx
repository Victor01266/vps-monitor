"use client";
import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Shield, ShieldOff, Unlock, RefreshCw, Copy, Check } from "lucide-react";
import { firewallAction } from "@/lib/api";

interface BlockedRule {
  num: string;
  target: string;
  protocol: string;
  source: string;
}

interface FirewallRulesPanelProps {
  rules: BlockedRule[];
  loading: boolean;
  onRefresh: () => void;
  onToast: (msg: string, ok: boolean) => void;
}

interface UnblockConfirmProps {
  ip: string | null;
  onClose: () => void;
  onConfirm: (ip: string) => Promise<void>;
  loading: boolean;
}

function UnblockConfirmModal({ ip, onClose, onConfirm, loading }: UnblockConfirmProps) {
  return (
    <Modal open={!!ip} onClose={onClose} title="Confirmar Desbloqueio de IP">
      <div className="space-y-4">
        <div className="glass-warning rounded-lg p-4 text-center">
          <Unlock className="w-8 h-8 text-amber-400 mx-auto mb-2" />
          <p className="text-slate-200 text-sm">Desbloquear o IP</p>
          <p className="font-mono text-amber-300 text-lg font-bold mt-1">{ip}</p>
          <p className="text-xs text-slate-500 mt-2">
            Remove a regra DROP do iptables para este IP.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => ip && onConfirm(ip)}
            disabled={loading}
          >
            {loading ? <span className="animate-spin inline-block">⟳</span> : <Unlock className="w-4 h-4" />}
            {loading ? "Desbloqueando..." : "Confirmar Desbloqueio"}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export function FirewallRulesPanel({ rules, loading, onRefresh, onToast }: FirewallRulesPanelProps) {
  const [unblockIp, setUnblockIp] = useState<string | null>(null);
  const [unblockLoading, setUnblockLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleUnblock(ip: string) {
    setUnblockLoading(true);
    try {
      await firewallAction(ip, "unblock");
      onToast(`✓ IP ${ip} desbloqueado.`, true);
      onRefresh();
    } catch (e) {
      onToast(`✗ ${e instanceof Error ? e.message : "Falha"}`, false);
    } finally {
      setUnblockLoading(false);
      setUnblockIp(null);
    }
  }

  function copyAll() {
    const text = rules.map((r) => r.source).join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <>
      <UnblockConfirmModal
        ip={unblockIp}
        onClose={() => setUnblockIp(null)}
        onConfirm={handleUnblock}
        loading={unblockLoading}
      />

      <Card className="flex flex-col">
        <CardHeader>
          <CardTitle>
            <Shield className="w-4 h-4 text-[#00C2FF]" />
            Firewall · IPs Bloqueados
            <span className="ml-1 bg-[#00C2FF]/20 text-[#00C2FF] text-[10px] px-2 py-0.5 rounded-full font-mono border border-[#00C2FF]/25">
              {rules.length}
            </span>
          </CardTitle>
          <div className="flex items-center gap-2">
            {rules.length > 0 && (
              <button
                onClick={copyAll}
                className="flex items-center gap-1 text-[10px] text-[#AEB9E1] hover:text-white transition-colors px-2 py-1 rounded bg-[#0A1330] border border-[#343B4F]"
                title="Copiar todos os IPs"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copiado" : "Copiar"}
              </button>
            )}
            <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardHeader>

        {rules.length === 0 ? (
          <div className="text-center py-6 text-[#AEB9E1] text-sm">
            <Shield className="w-7 h-7 mx-auto mb-2 opacity-20" />
            Nenhum IP bloqueado
          </div>
        ) : (
          <div className="overflow-auto max-h-64">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#343B4F]">
                  <th className="text-left text-[#AEB9E1] font-medium py-1.5 pr-3 uppercase tracking-wider text-[10px]">#</th>
                  <th className="text-left text-[#AEB9E1] font-medium py-1.5 pr-3 uppercase tracking-wider text-[10px]">IP Bloqueado</th>
                  <th className="text-left text-[#AEB9E1] font-medium py-1.5 uppercase tracking-wider text-[10px]">Ação</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr
                    key={`${rule.num}-${rule.source}`}
                    className="border-b border-[#343B4F] hover:bg-[#0A1330] transition-colors group"
                  >
                    <td className="py-2 pr-3">
                      <span className="text-[#AEB9E1] font-mono">{rule.num}</span>
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex items-center gap-2">
                        <ShieldOff className="w-3 h-3 text-red-500/60 shrink-0" />
                        <span className="font-mono text-red-300">{rule.source}</span>
                        <Badge variant="danger" className="text-[9px]">DROP</Badge>
                      </div>
                    </td>
                    <td className="py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUnblockIp(rule.source)}
                        title="Desbloquear IP"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Unlock className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-amber-400 text-[10px]">Desbloquear</span>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}
