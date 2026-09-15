import { useState, useCallback } from 'react';
import { ui } from './styles';
import { Sidebar, type TabType } from './components/Sidebar';
import { DEFAULT_PRESETS } from './constants';
import { useServerFleet } from './hooks/useServerFleet';
import { useLoadEngine } from './hooks/useLoadEngine';

import { OrchestratorTab } from './tabs/OrchestratorTab';
import { FleetTab } from './tabs/FleetTab';
import { TracesTab } from './tabs/TracesTab';
import { AssertionsTab } from './tabs/AssertionsTab';
import { LogsTab } from './tabs/LogsTab';

import type { ScenarioConfiguration, LoadEngineSettings, ExecutionLog, ServerNode } from './types/benchmark';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('orchestrator');
  const [scenario, setScenario] = useState<ScenarioConfiguration>(DEFAULT_PRESETS[0]);
  const [logs, setLogs] = useState<ExecutionLog[]>([]);

  const [engineSettings, setEngineSettings] = useState<LoadEngineSettings>({
    profile: 'constant',
    concurrency: 12,
    totalRequests: 240,
    durationSeconds: 0,
    rateLimitRps: 0,
    assertions: [
      { id: 'a1', field: 'status', operator: 'lt', targetValue: '400', enabled: true },
      { id: 'a2', field: 'duration', operator: 'lt', targetValue: '500', enabled: true }
    ],
    stages: [
      { id: 's1', durationSeconds: 15, targetVUs: 20 },
      { id: 's2', durationSeconds: 30, targetVUs: 20 },
      { id: 's3', durationSeconds: 10, targetVUs: 0 }
    ]
  });

  const addLog = useCallback((level: ExecutionLog['level'], message: string) => {
    const entry: ExecutionLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date().toISOString().substring(11, 23),
      level,
      message
    };
    setLogs(prev => [entry, ...prev.slice(0, 240)]);
  }, []);

  // 🟢 Бизнес-сервисы (Services / ViewModels)
  const fleet = useServerFleet(scenario.targetUrl);
  const engine = useLoadEngine(scenario, engineSettings, addLog);

  const attachServerToBenchmark = (srv: ServerNode) => {
    const fullUrl = `${srv.baseUrl.replace(/\/$/, '')}${srv.healthPath.startsWith('/') ? '' : '/'}${srv.healthPath}`;
    setScenario(prev => ({
      ...prev,
      name: `Direct: ${srv.name}`,
      targetUrl: fullUrl
    }));
    setActiveTab('orchestrator');
    addLog('info', `Server attached as active target: ${fullUrl}`);
  };

  return (
    <div style={ui.shell}>
      <div style={ui.workspace}>
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          serversCount={fleet.servers.length}
          tracesCount={engine.traces.length}
          logsCount={logs.length}
          isRunning={engine.isRunning}
          concurrency={engineSettings.concurrency}
        />

        <main style={ui.contentArea}>
          {activeTab === 'orchestrator' && (
            <OrchestratorTab
              scenario={scenario}
              setScenario={setScenario}
              engineSettings={engineSettings}
              setEngineSettings={setEngineSettings}
              metrics={engine.metrics}
              isRunning={engine.isRunning}
              startLoadEngine={engine.startLoadEngine}
              stopLoadEngine={engine.stopLoadEngine}
              traces={engine.traces}
              telemetryBuckets={engine.telemetryBuckets}
              apmTelemetry={fleet.apmTelemetry}
              apmHistory={fleet.apmHistory}
              isApmConnected={fleet.isApmConnected}
            />
          )}

          {activeTab === 'servers' && (
            <FleetTab
              servers={fleet.servers}
              setServers={fleet.setServers}
              pingAllServers={fleet.pingAllServers}
              attachServerToBenchmark={attachServerToBenchmark}
              probeServer={fleet.probeServer}
            />
          )}

          {activeTab === 'traces' && <TracesTab traces={engine.traces} />}

          {activeTab === 'assertions' && (
            <AssertionsTab engineSettings={engineSettings} setEngineSettings={setEngineSettings} />
          )}

          {activeTab === 'logs' && <LogsTab logs={logs} setLogs={setLogs} />}
        </main>
      </div>
    </div>
  );
}