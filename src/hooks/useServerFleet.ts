import { useState, useEffect } from 'react';
import type { ServerNode, ServerProcessTelemetry } from '../types/benchmark';
import { INITIAL_SERVERS } from '../constants';

export function useServerFleet(targetUrl: string) {
  const [servers, setServers] = useState<ServerNode[]>(INITIAL_SERVERS);
  const [apmTelemetry, setApmTelemetry] = useState<ServerProcessTelemetry | null>(null);
  const [apmHistory, setApmHistory] = useState<ServerProcessTelemetry[]>([]);
  const [isApmConnected, setIsApmConnected] = useState<boolean>(false);

  const probeServer = async (srv: ServerNode): Promise<Partial<ServerNode>> => {
    const t0 = performance.now();
    try {
      const target = `${srv.baseUrl.replace(/\/$/, '')}${srv.healthPath.startsWith('/') ? '' : '/'}${srv.healthPath}`;
      const res = await fetch(target, { method: 'GET', signal: AbortSignal.timeout(2000) });
      const lat = Math.round(performance.now() - t0);
      return {
        status: res.ok ? (lat > 500 ? 'degraded' : 'healthy') : 'degraded',
        latencyMs: lat,
        lastChecked: new Date().toLocaleTimeString(),
        history: [...srv.history.slice(-11), lat]
      };
    } catch {
      return {
        status: 'offline',
        latencyMs: null,
        lastChecked: new Date().toLocaleTimeString(),
        history: [...srv.history.slice(-11), 0]
      };
    }
  };

  const pingAllServers = async () => {
    const updated = await Promise.all(
      servers.map(async s => {
        const update = await probeServer(s);
        return { ...s, ...update };
      })
    );
    setServers(updated);
  };

  useEffect(() => {
    pingAllServers();
    const interval = setInterval(pingAllServers, 10000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    const pollApm = async () => {
      try {
        const origin = new URL(targetUrl).origin;
        const res = await fetch(`${origin}/api/system-metrics`, { signal: AbortSignal.timeout(1500) });
        if (!res.ok) throw new Error();
        const data: ServerProcessTelemetry = await res.json();
        if (active) {
          setApmTelemetry(data);
          setApmHistory(prev => [...prev.slice(-30), data]);
          setIsApmConnected(true);
        }
      } catch {
        if (active) setIsApmConnected(false);
      }
    };

    pollApm();
    const interval = setInterval(pollApm, 1500);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [targetUrl]);

  return {
    servers,
    setServers,
    probeServer,
    pingAllServers,
    apmTelemetry,
    apmHistory,
    isApmConnected
  };
}