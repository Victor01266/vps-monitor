"use client";

import { MainLayout } from "@/components/layout/MainLayout";
import { useCallback } from "react";
import { usePolling } from "@/hooks/usePolling";
import { fetchServices } from "@/lib/api";

interface Container {
  name: string;
  image: string;
  ports: string;
  status: string;
  state?: string;
}

interface ServicesResponse {
  containers: Container[];
}

export default function ServicesPage() {
  const servicesFetcher = useCallback(() => fetchServices() as Promise<ServicesResponse>, []);
  const { data: servicesData } = usePolling(servicesFetcher, 15000);

  return (
    <MainLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-semibold text-white">Serviços</h2>
          <p className="text-sm text-[#AEB9E1] mt-1">Status em tempo real de todos os containers e processos rodando na VPS.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {servicesData?.containers?.map((container: Container) => {
            const isUp = container.status.toLowerCase().includes("up");
            const isHealthy = container.status.toLowerCase().includes("healthy") && !container.status.toLowerCase().includes("unhealthy");
            
            let statusLabel = "Offline";
            if (isUp) {
              if (isHealthy) statusLabel = "Healthy";
              else if (container.status.toLowerCase().includes("unhealthy")) statusLabel = "Unhealthy";
              else statusLabel = "Up";
            }

            const dotColor = isUp ? (isHealthy ? "#14CA74" : container.status.toLowerCase().includes("unhealthy") ? "#FF3B3B" : "#00C2FF") : "#AEB9E1";
            const pillBg   = isUp ? (isHealthy ? "rgba(20,202,116,0.15)" : container.status.toLowerCase().includes("unhealthy") ? "rgba(255,59,59,0.15)" : "rgba(0,194,255,0.15)") : "rgba(174,185,225,0.12)";
            const pillBorder = isUp ? (isHealthy ? "rgba(20,202,116,0.35)" : container.status.toLowerCase().includes("unhealthy") ? "rgba(255,59,59,0.35)" : "rgba(0,194,255,0.35)") : "rgba(174,185,225,0.25)";

            return (
              <div
                key={container.name}
                style={{
                  background: '#0B1739',
                  borderRadius: 12,
                  border: '0.6px solid #343B4F',
                  boxShadow: '1px 1px 1px 0 rgba(16,25,52,0.40)',
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: 140,
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                    <p style={{ color: 'white', fontWeight: 600, fontSize: 16, lineHeight: '20px' }}>{container.name}</p>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      background: pillBg, border: `0.6px solid ${pillBorder}`,
                      borderRadius: 20, padding: '3px 10px',
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ color: dotColor, fontSize: 11, fontWeight: 500 }}>{statusLabel}</span>
                    </span>
                  </div>
                  <p style={{ color: '#AEB9E1', fontSize: 11, fontFamily: 'monospace', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={container.image}>{container.image}</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>{container.status}</p>
                  {container.ports && (
                    <p style={{ color: '#AEB9E1', fontSize: 10, fontFamily: 'monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={container.ports}>
                      Ports: {container.ports}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          
          {!(servicesData?.containers) && (
            <div className="col-span-full py-12 flex items-center justify-center border border-dashed border-[#343B4F] rounded-xl">
              <p className="text-[#AEB9E1]">Carregando serviços da VPS...</p>
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
