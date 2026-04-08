"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { useCallback, useState } from "react";
import { usePolling } from "@/hooks/usePolling";
import { fetchUFWRules, addUFWRule, deleteUFWRule } from "@/lib/api";
import { Badge } from "@/components/ui/Badge";
import { ShieldAlert, ShieldCheck, ShieldOff, Plus, Trash2, RefreshCw, Shield } from "lucide-react";

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

export default function FirewallPage() {
  const ufwFetcher = useCallback(() => fetchUFWRules() as Promise<UFWData>, []);
  const { data: ufwData, refetch } = usePolling(ufwFetcher, 30000);

  const [newTarget, setNewTarget] = useState("");
  const [newAction, setNewAction] = useState<"allow" | "deny" | "reject">("deny");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [deletingNum, setDeletingNum] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

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
    if (confirmDelete !== num) {
      setConfirmDelete(num);
      return;
    }
    setDeletingNum(num);
    setConfirmDelete(null);
    try {
      await deleteUFWRule(num);
      refetch();
    } finally {
      setDeletingNum(null);
    }
  };

  const allowCount = ufwData?.rules.filter((r) => r.action === "ALLOW").length ?? 0;
  const denyCount = ufwData?.rules.filter((r) => r.action === "DENY" || r.action === "REJECT").length ?? 0;

  function actionBadge(action: string) {
    if (action === "ALLOW") return <Badge variant="success"><ShieldCheck className="w-3 h-3" />{action}</Badge>;
    if (action === "DENY" || action === "REJECT") return <Badge variant="danger"><ShieldOff className="w-3 h-3" />{action}</Badge>;
    return <Badge variant="warning"><Shield className="w-3 h-3" />{action}</Badge>;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">Firewall</h2>
            <p className="text-sm text-[#AEB9E1] mt-1">
              Regras UFW ativas —{" "}
              <span className={ufwData?.status === "active" ? "text-emerald-400" : "text-amber-400"}>
                {ufwData?.status ?? "carregando..."}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-[#0B1739] border border-[#343B4F] rounded-lg px-4 py-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <p className="text-[10px] text-[#AEB9E1] uppercase tracking-wider">Allow</p>
                <p className="text-lg font-bold text-white leading-none">{allowCount}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-[#0B1739] border border-[#343B4F] rounded-lg px-4 py-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <div>
                <p className="text-[10px] text-[#AEB9E1] uppercase tracking-wider">Deny</p>
                <p className="text-lg font-bold text-white leading-none">{denyCount}</p>
              </div>
            </div>
            <button
              onClick={() => refetch()}
              className="p-2 rounded-lg bg-[#0B1739] border border-[#343B4F] text-[#AEB9E1] hover:text-white transition-colors"
              title="Atualizar regras"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Add rule form */}
        <div className="rounded-xl bg-[#0B1739] border border-[#343B4F] p-4">
          <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
            <Plus className="w-4 h-4 text-[#CB3CFF]" />
            Adicionar nova regra
          </h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={newTarget}
              onChange={(e) => setNewTarget(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              placeholder="IP (ex: 192.168.1.1) ou porta (ex: 22/tcp)"
              className="flex-1 bg-[#0A1330] border border-[#343B4F] rounded-lg px-3 py-2 text-sm text-white placeholder-[#AEB9E1]/50 focus:outline-none focus:border-[#CB3CFF] transition-colors"
            />
            <select
              value={newAction}
              onChange={(e) => setNewAction(e.target.value as "allow" | "deny" | "reject")}
              className="bg-[#0A1330] border border-[#343B4F] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#CB3CFF] transition-colors"
            >
              <option value="deny">DENY</option>
              <option value="allow">ALLOW</option>
              <option value="reject">REJECT</option>
            </select>
            <button
              onClick={handleAdd}
              disabled={adding || !newTarget.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#CB3CFF]/20 border border-[#CB3CFF]/40 text-[#CB3CFF] text-sm font-medium hover:bg-[#CB3CFF]/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              {adding ? "Adicionando..." : "Adicionar"}
            </button>
          </div>
          {addError && (
            <p className="text-xs text-red-400 mt-2">{addError}</p>
          )}
        </div>

        {/* Rules table */}
        <div className="rounded-xl bg-[#0B1739] border border-[#343B4F] overflow-hidden" style={{ boxShadow: "1px 1px 1px rgba(15,24,52,0.40)" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#343B4F] bg-[#0A1330]/50">
                  <th className="text-left py-3 px-4 text-[#AEB9E1] font-medium text-xs uppercase tracking-wider">#</th>
                  <th className="text-left py-3 px-4 text-[#AEB9E1] font-medium text-xs uppercase tracking-wider">Para</th>
                  <th className="text-left py-3 px-4 text-[#AEB9E1] font-medium text-xs uppercase tracking-wider">De</th>
                  <th className="text-left py-3 px-4 text-[#AEB9E1] font-medium text-xs uppercase tracking-wider">Direção</th>
                  <th className="text-left py-3 px-4 text-[#AEB9E1] font-medium text-xs uppercase tracking-wider">Ação</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {ufwData?.rules.map((rule) => (
                  <tr
                    key={rule.num}
                    className={`border-b border-[#343B4F] transition-colors ${
                      rule.action === "ALLOW" ? "hover:bg-emerald-500/5" : "hover:bg-red-500/5"
                    }`}
                  >
                    <td className="py-3 px-4 text-[#AEB9E1] font-mono text-xs">{rule.num}</td>
                    <td className="py-3 px-4 text-white font-mono text-xs">{rule.to}</td>
                    <td className="py-3 px-4 text-[#AEB9E1] font-mono text-xs">{rule.from}</td>
                    <td className="py-3 px-4 text-[#AEB9E1] text-xs">{rule.direction}</td>
                    <td className="py-3 px-4">{actionBadge(rule.action)}</td>
                    <td className="py-3 px-4 text-right">
                      {confirmDelete === rule.num ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs text-amber-400">Confirmar?</span>
                          <button
                            onClick={() => handleDelete(rule.num)}
                            disabled={deletingNum === rule.num}
                            className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors disabled:opacity-40"
                          >
                            Sim
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2 py-1 rounded text-xs bg-[#0A1330] text-[#AEB9E1] border border-[#343B4F] hover:text-white transition-colors"
                          >
                            Não
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleDelete(rule.num)}
                          disabled={deletingNum === rule.num}
                          className="p-1.5 rounded text-[#AEB9E1] hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                          title="Remover regra"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {(!ufwData?.rules || ufwData.rules.length === 0) && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-[#AEB9E1]">
                      {ufwData ? "Nenhuma regra UFW encontrada." : "Carregando regras..."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
