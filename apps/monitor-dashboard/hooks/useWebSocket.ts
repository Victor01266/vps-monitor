"use client";
import { useEffect, useRef, useState } from "react";
import { createWebSocket } from "@/lib/api";

export interface SecurityAlert {
  event: "brute_force" | "invalid_user" | "accepted_login" | "fail2ban_ban" | "fail2ban_unban";
  log: string;
  ip?: string;
  user?: string;
  jail?: string;
  timestamp: string;
  raw: string;
}

export function useWebSocket() {
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    
    let isMounted = true;

    function connect() {
      const ws = createWebSocket();
      wsRef.current = ws;

      ws.onopen = () => {
        if (isMounted) setConnected(true);
      };
      
      ws.onclose = () => {
        if (isMounted) {
          setConnected(false);
          retryRef.current = setTimeout(connect, 5000);
        }
      };
      
      ws.onerror = () => ws.close();
      
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "security_alert" && isMounted) {
            setAlerts((prev) => [msg.data as SecurityAlert, ...prev].slice(0, 200));
          }
        } catch {
          // ignora mensagens malformadas
        }
      };
    }

    connect();

    return () => {
      isMounted = false;
      if (retryRef.current) clearTimeout(retryRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // Evita reconexão ao desmontar
        wsRef.current.close();
      }
    };
  }, []);

  return { alerts, connected };
}
