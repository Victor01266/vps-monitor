"use client";
import { useState } from "react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Server, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Container {
  name: string;
  image: string;
  ports: string;
  status: string;
  state?: string;
}

interface ContainersTableProps {
  containers: Container[];
  loading: boolean;
  onRefresh: () => void;
}

function statusBadge(status: string) {
  if (status.includes("unhealthy")) return <Badge variant="danger">Unhealthy</Badge>;
  if (status.includes("healthy")) return <Badge variant="success">Healthy</Badge>;
  if (status.toLowerCase().includes("up")) return <Badge variant="default">Running</Badge>;
  if (status.toLowerCase().includes("exited")) return <Badge variant="muted">Stopped</Badge>;
  return <Badge variant="muted">{status.slice(0, 20)}</Badge>;
}

function shortImage(image: string) {
  return image.split("/").pop()?.split(":")[0] ?? image;
}

function isUnhealthy(c: Container) {
  return c.status.includes("unhealthy");
}

export function ContainersTable({ containers, loading, onRefresh }: ContainersTableProps) {
  const [showAll, setShowAll] = useState(false);

  const visible = containers.filter(
    (c) => c.name && c.state !== "dead" && (showAll || c.state === "running" || c.state === "created")
  );
  const runningCount = containers.filter((c) => c.state === "running").length;
  const totalNamed = containers.filter((c) => c.name).length;

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>
          <Server className="w-4 h-4 text-[#00C2FF]" />
          Docker
          <span className="font-normal normal-case tracking-normal text-[10px] ml-1 text-[#AEB9E1]">
            {runningCount}/{totalNamed}
          </span>
        </CardTitle>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAll((v) => !v)}
            className="text-[10px] text-[#AEB9E1] hover:text-white transition-colors px-2 py-1 rounded bg-[#0A1330] border border-[#343B4F]"
          >
            {showAll ? "Ativos" : "Todos"}
          </button>
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-[#343B4F]">
              <th className="text-left text-[#AEB9E1] font-medium py-2 pr-3 uppercase tracking-wider text-[10px]">Nome</th>
              <th className="text-left text-[#AEB9E1] font-medium py-2 pr-3 uppercase tracking-wider text-[10px] hidden sm:table-cell">Imagem</th>
              <th className="text-left text-[#AEB9E1] font-medium py-2 pr-3 uppercase tracking-wider text-[10px] hidden md:table-cell">Porta(s)</th>
              <th className="text-left text-[#AEB9E1] font-medium py-2 uppercase tracking-wider text-[10px]">Status</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((c) => (
              <tr
                key={c.name}
                className={`border-b border-[#343B4F] hover:bg-[#0A1330] transition-colors ${
                  isUnhealthy(c) ? "border-l-2 border-l-red-500/50 bg-red-500/5" : ""
                }`}
              >
                <td className="py-2 pr-3">
                  <span className={`font-mono font-medium ${isUnhealthy(c) ? "text-red-300" : "text-white"}`}>
                    {c.name}
                  </span>
                </td>
                <td className="py-2 pr-3 hidden sm:table-cell">
                  <span className="text-[#AEB9E1]">{shortImage(c.image)}</span>
                </td>
                <td className="py-2 pr-3 hidden md:table-cell">
                  {c.ports ? (
                    <span className="font-mono text-[#00C2FF] text-[10px]">{c.ports.split(",")[0].trim()}</span>
                  ) : (
                    <span className="text-[#AEB9E1]/40">—</span>
                  )}
                </td>
                <td className="py-2">{statusBadge(c.status)}</td>
              </tr>
            ))}
            {visible.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="py-8 text-center text-[#AEB9E1] text-xs">
                  Nenhum contêiner {showAll ? "encontrado" : "ativo"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
