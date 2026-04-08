"use client";
import { useState, useMemo } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { AlertTriangle, Shield, ShieldOff, Eye, Ban, Zap, Trash2, ShieldAlert } from "lucide-react";
import { firewallAction } from "@/lib/api";
import { SecurityAlert } from "@/hooks/useWebSocket";

interface Attacker {
  ip: string;
  attempts: number;
}

interface ThreatsProps {
  alerts: SecurityAlert[];
  topAttackers: Attacker[];
  onBlock: (ip: string) => void;
}

interface DetailModalProps {
  alert: SecurityAlert | null;
  onClose: () => void;
  onBlock: (ip: string) => void;
}

function DetailModal({ alert, onClose, onBlock }: DetailModalProps) {
  if (!alert) return null;
  return (
    <Modal open={!!alert} onClose={onClose} title="Detalhes da Ameaça">
      <div className="space-y-3 text-sm">
        <div className="grid grid-cols-2 gap-3">
          <div className="glass rounded-lg p-3">
            <p className="text-xs text-[#AEB9E1] mb-1">Tipo</p>
            <p className="text-slate-200 font-medium capitalize">
              {alert.event.replace("_", " ")}
            </p>
          </div>
          <div className="glass rounded-lg p-3">
            <p className="text-xs text-[#AEB9E1] mb-1">IP</p>
            <p className="font-mono text-red-300 font-medium">{alert.ip ?? "—"}</p>
          </div>
          <div className="glass rounded-lg p-3">
            <p className="text-xs text-[#AEB9E1] mb-1">Usuário alvo</p>
            <p className="font-mono text-white">{alert.user ?? alert.jail ?? "—"}</p>
          </div>
          <div className="glass rounded-lg p-3">
            <p className="text-xs text-[#AEB9E1] mb-1">Timestamp</p>
            <p className="font-mono text-[#AEB9E1] text-xs">{alert.timestamp}</p>
          </div>
        </div>

        <div className="glass rounded-lg p-3">
          <p className="text-xs text-[#AEB9E1] mb-1">Log bruto</p>
          <p className="font-mono text-xs text-[#AEB9E1] break-all">{alert.raw}</p>
        </div>

        {alert.ip && (
          <div className="flex gap-2 pt-2">
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => { onBlock(alert.ip!); onClose(); }}
            >
              <Ban className="w-4 h-4" />
              Bloquear {alert.ip}
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Fechar
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

interface BlockConfirmModalProps {
  ip: string | null;
  onClose: () => void;
  onConfirm: (ip: string) => Promise<void>;
  loading: boolean;
}

function BlockConfirmModal({ ip, onClose, onConfirm, loading }: BlockConfirmModalProps) {
  return (
    <Modal open={!!ip} onClose={onClose} title="⚠️ Confirmar Bloqueio de IP">
      <div className="space-y-4">
        <div className="glass-danger rounded-lg p-4 text-center">
          <ShieldOff className="w-8 h-8 text-red-400 mx-auto mb-2" />
          <p className="text-slate-200 text-sm">
            Tem certeza que deseja bloquear o IP
          </p>
          <p className="font-mono text-red-300 text-lg font-bold mt-1">{ip}</p>
          <p className="text-xs text-slate-500 mt-2">
            Esta ação executará{" "}
            <code className="text-amber-400">/sbin/iptables -A INPUT -s {ip} -j DROP</code>{" "}
            na VPS.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="danger"
            className="flex-1"
            onClick={() => ip && onConfirm(ip)}
            disabled={loading}
          >
            {loading ? (
              <span className="animate-spin">⟳</span>
            ) : (
              <Ban className="w-4 h-4" />
            )}
            {loading ? "Bloqueando..." : "Confirmar Bloqueio"}
          </Button>
          <Button variant="ghost" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function eventLabel(event: string) {
  const map: Record<string, { label: string; variant: "danger" | "warning" | "success" | "default" | "muted" }> = {
    brute_force: { label: "Força Bruta", variant: "danger" },
    invalid_user: { label: "Usuário Inválido", variant: "warning" },
    accepted_login: { label: "Login Aceito", variant: "success" },
    fail2ban_ban: { label: "Banido", variant: "danger" },
    fail2ban_unban: { label: "Desbanido", variant: "muted" },
  };
  return map[event] ?? { label: event, variant: "muted" as const };
}

export function ThreatsSection({ alerts, topAttackers, onBlock }: ThreatsProps) {
  const [detailAlert, setDetailAlert] = useState<SecurityAlert | null>(null);
  const [blockIp, setBlockIp] = useState<string | null>(null);
  const [blockLoading, setBlockLoading] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  function showToast(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }

  async function handleBlock(ip: string) {
    setBlockLoading(true);
    try {
      await firewallAction(ip, "block");
      showToast(`✓ IP ${ip} bloqueado.`, true);
      onBlock(ip);
    } catch (e) {
      showToast(`✗ ${e instanceof Error ? e.message : "Falha"}`, false);
    } finally {
      setBlockLoading(false);
      setBlockIp(null);
    }
  }

  async function handleBlockAll() {
    const targets = topAttackers.slice(0, 5).map((a) => a.ip);
    if (targets.length === 0) return;
    setBatchLoading(true);
    let ok = 0;
    let fail = 0;
    for (const ip of targets) {
      try {
        await firewallAction(ip, "block");
        ok++;
      } catch {
        fail++;
      }
    }
    setBatchLoading(false);
    showToast(
      fail === 0
        ? `✓ ${ok} IPs bloqueados.`
        : `✓ ${ok} bloqueados · ✗ ${fail} falhas`,
      fail === 0
    );
    onBlock("");
  }

  // Taxa de ataque nos últimos 5 min (alertas com timestamp recente)
  const attackRate = useMemo(() => {
    const fiveMinAgo = Date.now() - 5 * 60 * 1000;
    const recent = alerts.filter((a) => {
      if (a.event === "accepted_login" || a.event === "fail2ban_unban") return false;
      const t = new Date(a.timestamp).getTime();
      return !isNaN(t) && t >= fiveMinAgo;
    });
    return recent.length;
  }, [alerts]);

  const recentAttacks = alerts
    .filter((_, i) => !dismissed.has(i))
    .filter((a) => a.event !== "accepted_login" && a.event !== "fail2ban_unban")
    .slice(0, 50);

  return (
    <>
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl text-sm font-medium shadow-lg transition-all ${
            toast.ok ? "glass-success text-emerald-300" : "glass-danger text-red-300"
          }`}
        >
          {toast.msg}
        </div>
      )}

      <DetailModal
        alert={detailAlert}
        onClose={() => setDetailAlert(null)}
        onBlock={(ip) => { setDetailAlert(null); setBlockIp(ip); }}
      />
      <BlockConfirmModal
        ip={blockIp}
        onClose={() => setBlockIp(null)}
        onConfirm={handleBlock}
        loading={blockLoading}
      />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Feed de ameaças em tempo real */}
        <Card variant="danger" className="xl:col-span-2 flex flex-col" style={{ maxHeight: 440 }}>
          <CardHeader>
            <CardTitle>
              <Zap className="w-4 h-4 text-red-400" />
              Feed de Ameaças
              {recentAttacks.length > 0 && (
                <span className="ml-1 bg-red-500/30 text-red-300 text-[10px] px-2 py-0.5 rounded-full font-mono">
                  {recentAttacks.length}
                </span>
              )}
              {attackRate > 0 && (
                <span className="ml-1 bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-full font-mono">
                  {attackRate}/5min
                </span>
              )}
            </CardTitle>
            {recentAttacks.length > 0 && (
              <button
                onClick={() => setDismissed(new Set(alerts.map((_, i) => i)))}
                className="flex items-center gap-1 text-[10px] text-[#AEB9E1] hover:text-white transition-colors px-2 py-1 rounded bg-[#0A1330] border border-[#343B4F]"
                title="Limpar feed"
              >
                <Trash2 className="w-3 h-3" />
                Limpar
              </button>
            )}
          </CardHeader>
          <div className="flex-1 overflow-auto space-y-1 pr-1">
            {recentAttacks.length === 0 && (
              <div className="text-center py-10 text-[#AEB9E1] text-sm">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-20" />
                Nenhuma ameaça detectada ainda
              </div>
            )}
            {recentAttacks.map((alert, i) => {
              const { label, variant } = eventLabel(alert.event);
              return (
                <div
                  key={i}
                  className="threat-enter flex items-center gap-3 px-3 py-2 rounded-lg bg-[#0A1330] hover:bg-[#121f46] border-l-2 border-[#CB3CFF]/60 transition-colors group"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={variant}>{label}</Badge>
                      {alert.ip && (
                        <span className="font-mono text-xs text-red-300">{alert.ip}</span>
                      )}
                      {alert.user && (
                        <span className="text-[10px] text-[#AEB9E1]">→ {alert.user}</span>
                      )}
                      <span className="text-[10px] text-[#AEB9E1] ml-auto hidden sm:block">
                        {alert.timestamp?.slice(11, 19)}
                      </span>
                    </div>
                    <p className="text-[10px] text-[#AEB9E1]/80 mt-0.5 truncate">{alert.raw}</p>
                  </div>
                  <div className="shrink-0 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDetailAlert(alert)}
                      title="Ver detalhes"
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    {alert.ip && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setBlockIp(alert.ip!)}
                        title="Bloquear IP"
                      >
                        <Ban className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Top Atacantes */}
        <Card className="flex flex-col" style={{ maxHeight: 440 }}>
          <CardHeader>
            <CardTitle>
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              Top Atacantes
            </CardTitle>
            {topAttackers.length > 0 && (
              <button
                onClick={handleBlockAll}
                disabled={batchLoading}
                className="flex items-center gap-1 text-[10px] text-red-400 hover:text-red-300 transition-colors px-2 py-1 rounded bg-red-500/10 border border-red-500/20 disabled:opacity-50"
                title="Bloquear top 5 atacantes"
              >
                {batchLoading ? (
                  <span className="animate-spin inline-block w-3 h-3">⟳</span>
                ) : (
                  <Ban className="w-3 h-3" />
                )}
                {batchLoading ? "Bloqueando..." : "Bloquear Top 5"}
              </button>
            )}
          </CardHeader>
          <div className="flex-1 overflow-auto space-y-1.5">
            {topAttackers.length === 0 && (
              <p className="text-center text-[#AEB9E1] text-sm py-6">Sem dados</p>
            )}
            {topAttackers.map((atk, i) => (
              <div
                key={atk.ip}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-[#0A1330] hover:bg-[#121f46] transition-colors group"
              >
                <span className="text-[10px] font-bold text-[#AEB9E1] w-5 text-right shrink-0">
                  #{i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-xs text-white truncate">{atk.ip}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <div
                      className="h-1 rounded-full bg-linear-to-r from-[#CB3CFF] to-[#00C2FF] flex-1"
                      style={{
                        width: `${Math.min(100, (atk.attempts / (topAttackers[0]?.attempts || 1)) * 100)}%`,
                      }}
                    />
                    <span className="text-[10px] text-[#AEB9E1] shrink-0 font-mono tabular-nums">
                      {atk.attempts}x
                    </span>
                  </div>
                </div>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => setBlockIp(atk.ip)}
                  title="Bloquear IP"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Ban className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}
