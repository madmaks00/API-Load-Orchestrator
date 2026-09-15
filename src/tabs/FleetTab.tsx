// src/tabs/FleetTab.tsx
import React, { useState } from 'react';
import { Icons } from '../components/Icons';
import { ui } from '../styles';
import type { ServerNode } from '../types/benchmark';

interface FleetTabProps {
  servers: ServerNode[];
  setServers: React.Dispatch<React.SetStateAction<ServerNode[]>>;
  pingAllServers: () => void | Promise<void>;
  attachServerToBenchmark: (srv: ServerNode) => void;
  probeServer: (srv: ServerNode) => Promise<Partial<ServerNode>>;
}

export const FleetTab: React.FC<FleetTabProps> = ({
  servers,
  setServers,
  pingAllServers,
  attachServerToBenchmark,
  probeServer
}) => {
  const [isAddingServer, setIsAddingServer] = useState(false);
  const [newServerForm, setNewServerForm] = useState({
    name: '',
    baseUrl: 'http://localhost:5114',
    healthPath: '/api/test',
    environment: 'development' as ServerNode['environment']
  });

  const handleAddServerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServerForm.name || !newServerForm.baseUrl) return;

    const created: ServerNode = {
      id: `srv-${Date.now()}`,
      name: newServerForm.name,
      baseUrl: newServerForm.baseUrl,
      healthPath: newServerForm.healthPath || '/',
      environment: newServerForm.environment,
      status: 'probing',
      latencyMs: null,
      uptimePercent: 100.0,
      lastChecked: 'Checking...',
      history: [0, 0, 0, 0, 0],
      tags: [newServerForm.environment.toUpperCase(), 'Custom']
    };

    setServers(prev => [created, ...prev]);
    setIsAddingServer(false);
    probeServer(created).then(up => {
      setServers(curr => (curr.map(s => (s.id === created.id ? { ...s, ...up } : s))));
    });
    setNewServerForm({ name: '', baseUrl: 'http://localhost:5114', healthPath: '/api/test', environment: 'development' });
  };

  const fleetAvgLatency = Math.round(
    servers.reduce((acc, s) => acc + (s.latencyMs || 0), 0) /
      Math.max(servers.filter(s => s.latencyMs !== null).length, 1)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#f4f4f5' }}>Target Server Fleet & Endpoints</h2>
          <p style={{ fontSize: '12px', color: '#71717a', marginTop: '2px' }}>
            Continuous synthetic health probes and dynamic routing registry
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={pingAllServers} style={ui.secondaryBtn}>
            <Icons.RefreshCw />
            <span>Probe All</span>
          </button>
          <button onClick={() => setIsAddingServer(true)} style={ui.primaryBtn}>
            <Icons.Plus />
            <span>Register Node</span>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <div style={ui.kpiCard}>
          <span style={ui.kpiLabel}>Total Monitored Nodes</span>
          <div style={ui.kpiValueRow}>
            <span style={{ ...ui.kpiNumber, color: '#f4f4f5' }}>{servers.length}</span>
          </div>
          <span style={ui.kpiFooter}>Across all environments</span>
        </div>
        <div style={ui.kpiCard}>
          <span style={ui.kpiLabel}>Healthy Nodes</span>
          <div style={ui.kpiValueRow}>
            <span style={{ ...ui.kpiNumber, color: '#10b981' }}>
              {servers.filter(s => s.status === 'healthy').length}
            </span>
          </div>
          <span style={ui.kpiFooter}>Passing HTTP 200 OK</span>
        </div>
        <div style={ui.kpiCard}>
          <span style={ui.kpiLabel}>Fleet Avg Latency</span>
          <div style={ui.kpiValueRow}>
            <span style={{ ...ui.kpiNumber, color: '#06b6d4' }}>{fleetAvgLatency}</span>
            <span style={ui.kpiUnit}>ms</span>
          </div>
          <span style={ui.kpiFooter}>Live heartbeat roundtrip</span>
        </div>
        <div style={ui.kpiCard}>
          <span style={ui.kpiLabel}>Fleet Availability</span>
          <div style={ui.kpiValueRow}>
            <span style={{ ...ui.kpiNumber, color: '#10b981' }}>99.9%</span>
          </div>
          <span style={ui.kpiFooter}>Global synthetic uptime SLA</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '14px' }}>
        {servers.map(server => {
          const isOnline = server.status === 'healthy';
          const isDegraded = server.status === 'degraded';
          const statusColor = isOnline ? '#10b981' : isDegraded ? '#eab308' : '#ef4444';

          return (
            <div key={server.id} style={ui.serverCard}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: statusColor,
                        boxShadow: isOnline ? '0 0 8px rgba(16, 185, 129, 0.4)' : 'none'
                      }}
                    />
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#f4f4f5' }}>{server.name}</span>
                  </div>
                  <div style={{ fontSize: '11px', fontFamily: 'monospace', color: '#71717a', marginTop: '4px' }}>
                    {server.baseUrl}{server.healthPath}
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: server.environment === 'production' ? '#3b0764' : '#18181b',
                    color: server.environment === 'production' ? '#c084fc' : '#a1a1aa',
                    border: '1px solid #27272a'
                  }}
                >
                  {server.environment.toUpperCase()}
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '16px',
                  padding: '10px',
                  backgroundColor: '#09090b',
                  borderRadius: '6px',
                  border: '1px solid #1f1f23'
                }}
              >
                <div>
                  <div style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase' }}>Ping / Latency</div>
                  <div style={{ fontSize: '16px', fontWeight: 700, color: statusColor, fontFamily: 'monospace' }}>
                    {server.latencyMs !== null ? `${server.latencyMs} ms` : 'UNREACHABLE'}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '28px', width: '90px' }}>
                  {server.history.map((val, idx) => {
                    const max = Math.max(...server.history, 20);
                    const h = Math.max((val / max) * 100, 10);
                    return (
                      <div
                        key={idx}
                        title={`${val}ms`}
                        style={{
                          flex: 1,
                          height: `${h}%`,
                          backgroundColor: val > 100 ? '#f43f5e' : '#06b6d4',
                          borderRadius: '1px'
                        }}
                      />
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
                {server.tags.map((t, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      backgroundColor: '#18181b',
                      color: '#71717a',
                      borderRadius: '4px'
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
                <button
                  onClick={() => attachServerToBenchmark(server)}
                  style={{ ...ui.primaryBtn, flex: 1, justifyContent: 'center' }}
                >
                  <Icons.ArrowUpRight />
                  <span>Attach to Benchmark</span>
                </button>
                <button
                  onClick={async () => {
                    const res = await probeServer(server);
                    setServers(curr => curr.map(s => (s.id === server.id ? { ...s, ...res } : s)));
                  }}
                  style={ui.secondaryBtn}
                >
                  <Icons.RefreshCw />
                </button>
                <button
                  onClick={() => setServers(curr => curr.filter(s => s.id !== server.id))}
                  style={ui.iconBtn}
                >
                  <Icons.Trash />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {isAddingServer && (
        <div style={ui.modalOverlay}>
          <div style={ui.modalCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={ui.cardTitle}>Register Infrastructure Node</div>
              <button onClick={() => setIsAddingServer(false)} style={ui.iconBtn}>✕</button>
            </div>

            <form
              onSubmit={handleAddServerSubmit}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '14px' }}
            >
              <div>
                <label style={ui.inputLabel}>Server / Cluster Label</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ASP.NET Messenger Staging"
                  value={newServerForm.name}
                  onChange={e => setNewServerForm({ ...newServerForm, name: e.target.value })}
                  style={ui.formInput}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '10px' }}>
                <div>
                  <label style={ui.inputLabel}>Base Host URL</label>
                  <input
                    type="text"
                    required
                    placeholder="http://localhost:5114"
                    value={newServerForm.baseUrl}
                    onChange={e => setNewServerForm({ ...newServerForm, baseUrl: e.target.value })}
                    style={ui.formInput}
                  />
                </div>
                <div>
                  <label style={ui.inputLabel}>Health Probe Path</label>
                  <input
                    type="text"
                    placeholder="/api/test"
                    value={newServerForm.healthPath}
                    onChange={e => setNewServerForm({ ...newServerForm, healthPath: e.target.value })}
                    style={ui.formInput}
                  />
                </div>
              </div>

              <div>
                <label style={ui.inputLabel}>Environment</label>
                <select
                  value={newServerForm.environment}
                  onChange={e => setNewServerForm({ ...newServerForm, environment: e.target.value as any })}
                  style={ui.formSelect}
                >
                  <option value="development">Development</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button type="button" onClick={() => setIsAddingServer(false)} style={ui.secondaryBtn}>
                  Cancel
                </button>
                <button type="submit" style={ui.primaryBtn}>
                  Save & Start Monitoring
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};