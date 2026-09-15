import { useMemo, type Dispatch, type SetStateAction } from 'react';
import { Icons } from '../components/Icons';
import { ui } from '../styles';
import type {
  HttpMethod,
  ScenarioConfiguration,
  LoadEngineSettings,
  RequestTrace,
  TelemetryBucket,
  AggregatedMetrics,
  ServerProcessTelemetry,
  RampStage,
  SpikeProfileSettings
} from '../types/benchmark';

interface TelemetryGraphsProps {
  traces: RequestTrace[];
  buckets: TelemetryBucket[];
}

const TelemetryGraphs = ({ traces, buckets }: TelemetryGraphsProps) => {
  const chartHeight = 110;
  const chartWidth = 560;

  const histogram = useMemo(() => {
    if (traces.length === 0) return [];
    const durations = traces.map(t => t.durationMs);
    const min = Math.min(...durations);
    const max = Math.max(...durations, 10);
    const bucketCount = 28;
    const step = (max - min) / bucketCount;

    const bins = Array.from({ length: bucketCount }, (_, i) => ({
      rangeStart: Math.round(min + i * step),
      rangeEnd: Math.round(min + (i + 1) * step),
      count: 0
    }));

    for (const d of durations) {
      const binIdx = Math.min(Math.floor((d - min) / (step || 1)), bucketCount - 1);
      if (bins[binIdx]) bins[binIdx].count++;
    }
    return bins;
  }, [traces]);

  const maxBinCount = Math.max(...histogram.map(b => b.count), 1);
  const maxBucketRps = Math.max(...buckets.map(b => b.rps), 10);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
      <div style={ui.graphCard}>
        <div style={ui.graphHeader}>
          <span style={ui.graphTitle}>Throughput & Latency Trend</span>
          <span style={ui.graphMeta}>Live RPS Stream</span>
        </div>
        <div style={{ height: chartHeight, width: '100%', position: 'relative', marginTop: '8px' }}>
          {buckets.length > 1 ? (
            <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
              <defs>
                <linearGradient id="rpsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <line x1="0" y1={chartHeight * 0.25} x2={chartWidth} y2={chartHeight * 0.25} stroke="#27272a" strokeDasharray="3 3" />
              <line x1="0" y1={chartHeight * 0.5} x2={chartWidth} y2={chartHeight * 0.5} stroke="#27272a" strokeDasharray="3 3" />
              <line x1="0" y1={chartHeight * 0.75} x2={chartWidth} y2={chartHeight * 0.75} stroke="#27272a" strokeDasharray="3 3" />

              {(() => {
                const points = buckets.map((b, idx) => {
                  const x = (idx / (buckets.length - 1)) * chartWidth;
                  const y = chartHeight - (b.rps / maxBucketRps) * (chartHeight - 16) - 8;
                  return `${x},${y}`;
                }).join(' ');

                const areaPoints = `0,${chartHeight} ${points} ${chartWidth},${chartHeight}`;

                return (
                  <>
                    <polygon points={areaPoints} fill="url(#rpsGrad)" />
                    <polyline points={points} fill="none" stroke="#06b6d4" strokeWidth="1.8" />
                  </>
                );
              })()}
            </svg>
          ) : (
            <div style={ui.emptyGraph}>Awaiting real-time throughput trend stream...</div>
          )}
        </div>
      </div>

      <div style={ui.graphCard}>
        <div style={ui.graphHeader}>
          <span style={ui.graphTitle}>Latency Distribution Histogram</span>
          <span style={ui.graphMeta}>{traces.length} samples collected</span>
        </div>
        <div style={{ height: chartHeight, display: 'flex', alignItems: 'flex-end', gap: '3px', marginTop: '8px' }}>
          {histogram.length > 0 ? (
            histogram.map((bin, i) => {
              const h = Math.max((bin.count / maxBinCount) * 100, 3);
              const isHigh = bin.rangeStart > 500;
              return (
                <div
                  key={i}
                  title={`${bin.rangeStart}-${bin.rangeEnd}ms: ${bin.count} calls`}
                  style={{
                    flex: 1,
                    height: `${h}%`,
                    backgroundColor: isHigh ? '#f43f5e' : '#3b82f6',
                    borderRadius: '2px 2px 0 0',
                    transition: 'height 0.15s ease'
                  }}
                />
              );
            })
          ) : (
            <div style={ui.emptyGraph}>Awaiting request timeline data...</div>
          )}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#71717a', marginTop: '6px', fontFamily: 'monospace' }}>
          <span>{histogram[0]?.rangeStart ?? 0}ms</span>
          <span>Fast &lt;200ms | High Latency &gt;500ms</span>
          <span>{histogram[histogram.length - 1]?.rangeEnd ?? 0}ms</span>
        </div>
      </div>
    </div>
  );
};

interface ServerApmWidgetProps {
  current: ServerProcessTelemetry | null;
  history: ServerProcessTelemetry[];
  isConnected: boolean;
}

const ServerApmWidget = ({ current, history, isConnected }: ServerApmWidgetProps) => {
  const chartHeight = 84;
  const chartWidth = 480;

  const maxMem = useMemo(() => {
    if (history.length === 0) return 150;
    const max = Math.max(...history.map(h => h.workingSetMb));
    return Math.max(max * 1.2, 50);
  }, [history]);

  const queueCount = current?.pendingWorkItemCount;
  const isStarving = queueCount !== undefined && queueCount > 20;

  return (
    <div style={ui.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: isConnected ? '#10b981' : '#71717a' }}><Icons.Cpu /></span>
          <span style={ui.cardTitle}>C# Kestrel Process Telemetry & Diagnostics (APM)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isStarving && (
            <span style={{
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 8px',
              borderRadius: '4px',
              backgroundColor: '#7f1d1d',
              color: '#fca5a5',
              border: '1px solid #ef4444'
            }}>
              ⚠️ THREADPOOL STARVATION (QUEUE: {queueCount})
            </span>
          )}
          <span style={{
            fontSize: '10px',
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: isConnected ? '#064e3b' : '#18181b',
            color: isConnected ? '#34d399' : '#71717a',
            border: '1px solid #27272a'
          }}>
            {isConnected ? 'LIVE AGENT LINKED (/api/system-metrics)' : 'NO APM PROBE DETECTED'}
          </span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px', marginTop: '12px' }}>
        <div style={ui.miniMetricBox}>
          <div style={ui.miniMetricLabel}>Process CPU</div>
          <div style={{
            ...ui.miniMetricVal,
            color: current?.cpuUsagePercent === undefined
              ? '#71717a'
              : current.cpuUsagePercent > 80
              ? '#ef4444'
              : current.cpuUsagePercent > 50
              ? '#f59e0b'
              : '#10b981'
          }}>
            {current?.cpuUsagePercent !== undefined ? `${current.cpuUsagePercent}%` : '--'}
          </div>
          <div style={ui.miniMetricSub}>
            {current?.cpuUsagePercent === undefined
              ? 'Нагрузка на ядра'
              : current.cpuUsagePercent > 80
              ? '⚠️ Троттлинг / Пик ЦП'
              : current.cpuUsagePercent > 50
              ? 'Высокая нагрузка'
              : 'Нормальная загрузка'}
          </div>
        </div>

        <div style={ui.miniMetricBox}>
          <div style={ui.miniMetricLabel}>Working Set (OS RAM)</div>
          <div style={{ ...ui.miniMetricVal, color: '#a855f7' }}>
            {current ? `${current.workingSetMb}` : '--'} <span style={ui.miniUnit}>MB</span>
          </div>
          <div style={ui.miniMetricSub}>Память процесса (ОС)</div>
        </div>

        <div style={ui.miniMetricBox}>
          <div style={ui.miniMetricLabel}>GC Managed Heap</div>
          <div style={{ ...ui.miniMetricVal, color: '#06b6d4' }}>
            {current ? `${current.allocatedMemoryMb}` : '--'} <span style={ui.miniUnit}>MB</span>
          </div>
          <div style={ui.miniMetricSub}>Выделено в куче C#</div>
        </div>

        <div style={ui.miniMetricBox}>
          <div style={ui.miniMetricLabel}>ThreadPool Threads</div>
          <div style={{ ...ui.miniMetricVal, color: '#38bdf8' }}>
            {current ? current.threadCount : '--'}
          </div>
          <div style={ui.miniMetricSub}>Активные потоки Kestrel</div>
        </div>

        <div style={{
          ...ui.miniMetricBox,
          borderColor: isStarving ? '#ef4444' : '#1f1f23'
        }}>
          <div style={ui.miniMetricLabel}>ThreadPool Queue</div>
          <div style={{
            ...ui.miniMetricVal,
            color: queueCount === undefined
              ? '#71717a'
              : queueCount > 20
              ? '#ef4444'
              : queueCount > 0
              ? '#f59e0b'
              : '#10b981'
          }}>
            {queueCount !== undefined ? queueCount : '--'}
          </div>
          <div style={ui.miniMetricSub}>
            {queueCount === undefined
              ? 'Очередь задач'
              : queueCount > 20
              ? '⚠️ Голодание пула!'
              : queueCount > 0
              ? 'Задачи в ожидании'
              : 'Очередь свободна'}
          </div>
        </div>

        <div style={ui.miniMetricBox}>
          <div style={ui.miniMetricLabel}>GC Collections (0/1/2)</div>
          <div style={{ ...ui.miniMetricVal, color: '#10b981' }}>
            {current ? `${current.gen0}/${current.gen1}/${current.gen2}` : '--'}
          </div>
          <div style={ui.miniMetricSub}>Сборки мусора поколений</div>
        </div>
      </div>

      <div style={{ height: chartHeight, width: '100%', position: 'relative', marginTop: '12px' }}>
        {history.length > 1 ? (
          <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="purpleGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#a855f7" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#a855f7" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <line x1="0" y1={chartHeight * 0.5} x2={chartWidth} y2={chartHeight * 0.5} stroke="#27272a" strokeDasharray="3 3" />
            {(() => {
              const wsPoints = history.map((h, i) => {
                const x = (i / (history.length - 1)) * chartWidth;
                const y = chartHeight - (h.workingSetMb / maxMem) * (chartHeight - 12) - 6;
                return `${x},${y}`;
              }).join(' ');

              const gcPoints = history.map((h, i) => {
                const x = (i / (history.length - 1)) * chartWidth;
                const y = chartHeight - (h.allocatedMemoryMb / maxMem) * (chartHeight - 12) - 6;
                return `${x},${y}`;
              }).join(' ');

              return (
                <>
                  <polygon points={`0,${chartHeight} ${wsPoints} ${chartWidth},${chartHeight}`} fill="url(#purpleGrad)" />
                  <polyline points={wsPoints} fill="none" stroke="#a855f7" strokeWidth="1.8" />
                  <polyline points={gcPoints} fill="none" stroke="#06b6d4" strokeWidth="1.5" strokeDasharray="4 2" />
                </>
              );
            })()}
          </svg>
        ) : (
          <div style={ui.emptyGraph}>
            {isConnected ? 'Накопление потока телеметрии памяти...' : 'Подключись к серверу с активным эндпоинтом /api/system-metrics'}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#71717a', marginTop: '4px' }}>
        <span>Purple: OS Working Set RAM</span>
        <span>Cyan (Dash): Managed GC Heap</span>
        <span>Max Scale: {Math.round(maxMem)} MB</span>
      </div>
    </div>
  );
};

interface OrchestratorTabProps {
  scenario: ScenarioConfiguration;
  setScenario: Dispatch<SetStateAction<ScenarioConfiguration>>;
  engineSettings: LoadEngineSettings;
  setEngineSettings: Dispatch<SetStateAction<LoadEngineSettings>>;
  metrics: AggregatedMetrics;
  isRunning: boolean;
  startLoadEngine: () => Promise<void>;
  stopLoadEngine: () => void;
  traces: RequestTrace[];
  telemetryBuckets: TelemetryBucket[];
  apmTelemetry: ServerProcessTelemetry | null;
  apmHistory: ServerProcessTelemetry[];
  isApmConnected: boolean;
}

export const OrchestratorTab = ({
  scenario,
  setScenario,
  engineSettings,
  setEngineSettings,
  metrics,
  isRunning,
  startLoadEngine,
  stopLoadEngine,
  traces,
  telemetryBuckets,
  apmTelemetry,
  apmHistory,
  isApmConnected
}: OrchestratorTabProps) => {
  const stages = engineSettings.stages || [];
  const totalRampTime = stages.reduce((sum, s) => sum + s.durationSeconds, 0);
  const maxRampVUs = Math.max(...stages.map(s => s.targetVUs), 0);

  const spike: SpikeProfileSettings = engineSettings.spikeSettings || {
    baseVUs: 5,
    spikeVUs: 50,
    preSpikeSeconds: 10,
    spikeDurationSeconds: 10,
    postSpikeSeconds: 15
  };
  const totalSpikeTime = spike.preSpikeSeconds + spike.spikeDurationSeconds + spike.postSpikeSeconds;

  const handleAddStage = () => {
    const nextStages: RampStage[] = [
      ...stages,
      {
        id: `stg-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
        durationSeconds: 15,
        targetVUs: stages.length > 0 ? stages[stages.length - 1].targetVUs : 20
      }
    ];
    setEngineSettings(prev => ({ ...prev, stages: nextStages }));
  };

  const handleUpdateStage = (id: string, field: 'durationSeconds' | 'targetVUs', value: number) => {
    const nextStages = stages.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    );
    setEngineSettings(prev => ({ ...prev, stages: nextStages }));
  };

  const handleDeleteStage = (id: string) => {
    const nextStages = stages.filter(s => s.id !== id);
    setEngineSettings(prev => ({ ...prev, stages: nextStages }));
  };

  const handleUpdateSpike = (field: keyof SpikeProfileSettings, value: number) => {
    setEngineSettings(prev => ({
      ...prev,
      spikeSettings: {
        ...(prev.spikeSettings || {
          baseVUs: 5,
          spikeVUs: 50,
          preSpikeSeconds: 10,
          spikeDurationSeconds: 10,
          postSpikeSeconds: 15
        }),
        [field]: value
      }
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={ui.card}>
        <div style={ui.urlComposerRow}>
          <select
            value={scenario.method}
            onChange={e => setScenario(prev => ({ ...prev, method: e.target.value as HttpMethod }))}
            style={ui.methodSelect}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>

          <input
            type="text"
            value={scenario.targetUrl}
            onChange={e => setScenario(prev => ({ ...prev, targetUrl: e.target.value }))}
            style={ui.urlInput}
          />

          {isRunning ? (
            <button onClick={stopLoadEngine} style={ui.dangerBtn}>
              <Icons.Square />
              <span>Abort ({metrics.completed})</span>
            </button>
          ) : (
            <button onClick={startLoadEngine} style={ui.primaryBtn}>
              <Icons.Play />
              <span>Trigger</span>
            </button>
          )}
        </div>
      </div>

      <div style={ui.kpiGrid}>
        <div style={ui.kpiCard}>
          <span style={ui.kpiLabel}>Current Throughput</span>
          <div style={ui.kpiValueRow}>
            <span style={{ ...ui.kpiNumber, color: '#06b6d4' }}>{metrics.currentRps}</span>
            <span style={ui.kpiUnit}>req/s</span>
          </div>
          <span style={ui.kpiFooter}>
            {engineSettings.profile === 'ramp_up'
              ? `Active: ${metrics.activeVUs ?? 0} VUs (Peak: ${maxRampVUs} VUs)`
              : engineSettings.profile === 'spike'
              ? `Active: ${metrics.activeVUs ?? 0} VUs (Surge Peak: ${spike.spikeVUs} VUs)`
              : `Across ${engineSettings.concurrency} concurrent VUs`}
          </span>
        </div>

        <div style={ui.kpiCard}>
          <span style={ui.kpiLabel}>Median Latency (P50)</span>
          <div style={ui.kpiValueRow}>
            <span style={{ ...ui.kpiNumber, color: '#10b981' }}>{metrics.p50}</span>
            <span style={ui.kpiUnit}>ms</span>
          </div>
          <span style={ui.kpiFooter}>Min: {metrics.minDurationMs}ms | Avg: {metrics.avgDurationMs}ms</span>
        </div>

        <div style={ui.kpiCard}>
          <span style={ui.kpiLabel}>Tail Latency (P99)</span>
          <div style={ui.kpiValueRow}>
            <span style={{ ...ui.kpiNumber, color: metrics.p99 > 800 ? '#f43f5e' : '#eab308' }}>
              {metrics.p99}
            </span>
            <span style={ui.kpiUnit}>ms</span>
          </div>
          <span style={ui.kpiFooter}>P90: {metrics.p90}ms | P99.9: {metrics.p999}ms</span>
        </div>

        <div style={ui.kpiCard}>
          <span style={ui.kpiLabel}>Error Rate / 429</span>
          <div style={ui.kpiValueRow}>
            <span style={{ ...ui.kpiNumber, color: metrics.errorRatePercent > 0 ? '#f43f5e' : '#a1a1aa' }}>
              {metrics.errorRatePercent}%
            </span>
            <span style={ui.kpiUnit}>({metrics.status429} throttled)</span>
          </div>
          <span style={ui.kpiFooter}>2xx: {metrics.status2xx} | 4xx: {metrics.status4xx} | 5xx: {metrics.status5xx}</span>
        </div>
      </div>

      <TelemetryGraphs traces={traces} buckets={telemetryBuckets} />

      <ServerApmWidget current={apmTelemetry} history={apmHistory} isConnected={isApmConnected} />

      <div style={ui.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={ui.cardTitle}>Detailed Latency SLA Distribution & Bandwidth Matrix</div>
          <span style={{ fontSize: '11px', color: '#71717a' }}>Sample pool: {metrics.completed} requests</span>
        </div>

        <div style={ui.matrixGrid}>
          <div style={ui.matrixCell}><span style={ui.matrixHeader}>Min</span><span style={ui.matrixVal}>{metrics.minDurationMs} ms</span></div>
          <div style={ui.matrixCell}><span style={ui.matrixHeader}>P50</span><span style={{ ...ui.matrixVal, color: '#10b981' }}>{metrics.p50} ms</span></div>
          <div style={ui.matrixCell}><span style={ui.matrixHeader}>P75</span><span style={ui.matrixVal}>{metrics.p75} ms</span></div>
          <div style={ui.matrixCell}><span style={ui.matrixHeader}>P90</span><span style={ui.matrixVal}>{metrics.p90} ms</span></div>
          <div style={ui.matrixCell}><span style={ui.matrixHeader}>P95</span><span style={ui.matrixVal}>{metrics.p95} ms</span></div>
          <div style={ui.matrixCell}><span style={ui.matrixHeader}>P99</span><span style={{ ...ui.matrixVal, color: '#f59e0b' }}>{metrics.p99} ms</span></div>
          <div style={ui.matrixCell}><span style={ui.matrixHeader}>P99.9</span><span style={{ ...ui.matrixVal, color: '#f43f5e' }}>{metrics.p999} ms</span></div>
          <div style={ui.matrixCell}><span style={ui.matrixHeader}>Max</span><span style={ui.matrixVal}>{metrics.maxDurationMs} ms</span></div>
          <div style={ui.matrixCell}><span style={ui.matrixHeader}>StdDev (±σ)</span><span style={ui.matrixVal}>±{metrics.stdDev} ms</span></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #1f1f23' }}>
          <div style={ui.bandwidthCell}>
            <span style={ui.bwLabel}>Total Data Ingress:</span>
            <strong style={ui.bwVal}>{(metrics.totalBytes / (1024 * 1024)).toFixed(2)} MB</strong>
          </div>
          <div style={ui.bandwidthCell}>
            <span style={ui.bwLabel}>Bandwidth Rate:</span>
            <strong style={ui.bwVal}>{metrics.throughputKbps} KB/s</strong>
          </div>
          <div style={ui.bandwidthCell}>
            <span style={ui.bwLabel}>Average Packet:</span>
            <strong style={ui.bwVal}>{metrics.avgBytes} Bytes</strong>
          </div>
          <div style={ui.bandwidthCell}>
            <span style={ui.bwLabel}>Execution Time:</span>
            <strong style={ui.bwVal}>{metrics.elapsedSeconds} s</strong>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
        <div style={ui.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={ui.cardTitle}>Engine Concurrency & Strategy</div>
            {engineSettings.profile === 'ramp_up' && (
              <span style={{ fontSize: '11px', color: '#06b6d4', fontWeight: 600 }}>
                Total: {totalRampTime}s | Peak: {maxRampVUs} VUs
              </span>
            )}
            {engineSettings.profile === 'spike' && (
              <span style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600 }}>
                Total: {totalSpikeTime}s | Peak: {spike.spikeVUs} VUs
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
            <div>
              <label style={ui.inputLabel}>Traffic Pattern</label>
              <select
                value={engineSettings.profile}
                onChange={e => setEngineSettings(prev => ({ ...prev, profile: e.target.value as any }))}
                style={ui.formSelect}
              >
                <option value="constant">Constant Virtual Users</option>
                <option value="ramp_up">Linear Ramp-Up (Stages)</option>
                <option value="spike">Spike Surge (Stress Peak)</option>
              </select>
            </div>

            {engineSettings.profile === 'constant' && (
              <div>
                <label style={ui.inputLabel}>Concurrent Workers (VUs): {engineSettings.concurrency}</label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={engineSettings.concurrency}
                  onChange={e => setEngineSettings(prev => ({ ...prev, concurrency: Number(e.target.value) }))}
                  style={{ width: '100%', accentColor: '#06b6d4', marginTop: '6px' }}
                />
              </div>
            )}

            {engineSettings.profile === 'ramp_up' && (
              <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button onClick={handleAddStage} style={{ ...ui.secondaryBtn, width: '100%', justifyContent: 'center' }}>
                  <Icons.Plus />
                  <span>Add Ramp Stage</span>
                </button>
              </div>
            )}

            {engineSettings.profile === 'spike' && (
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: '10px', color: '#a1a1aa' }}>Surge Stress Profile</span>
                <div style={{ fontSize: '12px', color: '#f59e0b', fontWeight: 600, marginTop: '4px' }}>
                  Base ({spike.baseVUs}) → ⚡ Peak ({spike.spikeVUs}) → Cooldown
                </div>
              </div>
            )}
          </div>

          {engineSettings.profile === 'ramp_up' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginTop: '14px',
              padding: '12px',
              backgroundColor: '#09090b',
              borderRadius: '6px',
              border: '1px solid #1f1f23'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: '#71717a', textTransform: 'uppercase', fontWeight: 700 }}>
                  Target Stages Progression (k6 Style)
                </span>
                <span style={{ fontSize: '10px', color: '#52525b' }}>
                  {stages.length} {stages.length === 1 ? 'stage' : 'stages'} configured
                </span>
              </div>

              {stages.length === 0 ? (
                <div style={{ fontSize: '11px', color: '#71717a', padding: '8px 0', textAlign: 'center' }}>
                  No stages defined. Click &quot;Add Ramp Stage&quot; to configure.
                </div>
              ) : (
                stages.map((stage, idx) => (
                  <div key={stage.id} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#71717a', width: '35px', fontFamily: 'monospace' }}>
                      #{idx + 1}
                    </span>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        min="1"
                        value={stage.durationSeconds}
                        onChange={e => handleUpdateStage(stage.id, 'durationSeconds', Math.max(Number(e.target.value), 1))}
                        style={{ ...ui.formInput, width: '70px', textAlign: 'center' }}
                      />
                      <span style={{ fontSize: '11px', color: '#a1a1aa' }}>sec</span>
                    </div>
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#a1a1aa' }}>→ Target:</span>
                      <input
                        type="number"
                        min="0"
                        max="200"
                        value={stage.targetVUs}
                        onChange={e => handleUpdateStage(stage.id, 'targetVUs', Math.max(Number(e.target.value), 0))}
                        style={{ ...ui.formInput, width: '70px', textAlign: 'center' }}
                      />
                      <span style={{ fontSize: '11px', color: '#a1a1aa' }}>VUs</span>
                    </div>
                    <button
                      onClick={() => handleDeleteStage(stage.id)}
                      style={{ ...ui.iconBtn, color: '#f43f5e' }}
                      title="Remove stage"
                    >
                      <Icons.Trash />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {engineSettings.profile === 'spike' && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              marginTop: '14px',
              padding: '12px',
              backgroundColor: '#09090b',
              borderRadius: '6px',
              border: '1px solid #1f1f23'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: '#f59e0b', textTransform: 'uppercase', fontWeight: 700 }}>
                  ⚡ Spike Surge Profile Parameters
                </span>
                <span style={{ fontSize: '10px', color: '#71717a', fontFamily: 'monospace' }}>
                  {spike.preSpikeSeconds}s @ {spike.baseVUs} VU → ⚡ {spike.spikeDurationSeconds}s @ {spike.spikeVUs} VU → {spike.postSpikeSeconds}s @ {spike.baseVUs} VU
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '8px' }}>
                <div>
                  <label style={ui.inputLabel}>Base VUs</label>
                  <input
                    type="number"
                    min="1"
                    value={spike.baseVUs}
                    onChange={e => handleUpdateSpike('baseVUs', Math.max(Number(e.target.value), 1))}
                    style={{ ...ui.formInput, textAlign: 'center' }}
                  />
                </div>
                <div>
                  <label style={ui.inputLabel}>⚡ Surge Peak</label>
                  <input
                    type="number"
                    min="1"
                    value={spike.spikeVUs}
                    onChange={e => handleUpdateSpike('spikeVUs', Math.max(Number(e.target.value), 1))}
                    style={{
                      ...ui.formInput,
                      textAlign: 'center',
                      borderColor: '#f59e0b',
                      color: '#f59e0b',
                      fontWeight: 700
                    }}
                  />
                </div>
                <div>
                  <label style={ui.inputLabel}>Pre-Spike (s)</label>
                  <input
                    type="number"
                    min="1"
                    value={spike.preSpikeSeconds}
                    onChange={e => handleUpdateSpike('preSpikeSeconds', Math.max(Number(e.target.value), 1))}
                    style={{ ...ui.formInput, textAlign: 'center' }}
                  />
                </div>
                <div>
                  <label style={ui.inputLabel}>Surge (s)</label>
                  <input
                    type="number"
                    min="1"
                    value={spike.spikeDurationSeconds}
                    onChange={e => handleUpdateSpike('spikeDurationSeconds', Math.max(Number(e.target.value), 1))}
                    style={{ ...ui.formInput, textAlign: 'center' }}
                  />
                </div>
                <div>
                  <label style={ui.inputLabel}>Recovery (s)</label>
                  <input
                    type="number"
                    min="1"
                    value={spike.postSpikeSeconds}
                    onChange={e => handleUpdateSpike('postSpikeSeconds', Math.max(Number(e.target.value), 1))}
                    style={{ ...ui.formInput, textAlign: 'center' }}
                  />
                </div>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '14px' }}>
            <div>
              <label style={ui.inputLabel}>Total Reqs Limit</label>
              <input
                type="number"
                value={engineSettings.totalRequests}
                onChange={e => setEngineSettings(prev => ({ ...prev, totalRequests: Number(e.target.value) }))}
                style={ui.formInput}
              />
            </div>

            <div>
              <label style={ui.inputLabel}>Duration (Sec, 0=None)</label>
              <input
                type="number"
                disabled={engineSettings.profile !== 'constant'}
                value={
                  engineSettings.profile === 'ramp_up'
                    ? totalRampTime
                    : engineSettings.profile === 'spike'
                    ? totalSpikeTime
                    : engineSettings.durationSeconds
                }
                onChange={e => setEngineSettings(prev => ({ ...prev, durationSeconds: Number(e.target.value) }))}
                style={{
                  ...ui.formInput,
                  opacity: engineSettings.profile !== 'constant' ? 0.6 : 1,
                  cursor: engineSettings.profile !== 'constant' ? 'not-allowed' : 'text'
                }}
              />
            </div>

            <div>
              <label style={ui.inputLabel}>RPS Throttle (0=Inf)</label>
              <input
                type="number"
                value={engineSettings.rateLimitRps}
                onChange={e => setEngineSettings(prev => ({ ...prev, rateLimitRps: Number(e.target.value) }))}
                style={ui.formInput}
              />
            </div>
          </div>
        </div>

        <div style={ui.card}>
          <div style={ui.cardTitle}>Payload & Authorization</div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            {(['none', 'bearer'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setScenario(prev => ({ ...prev, authType: mode }))}
                style={{
                  ...ui.segmentBtn,
                  backgroundColor: scenario.authType === mode ? '#27272a' : 'transparent',
                  color: scenario.authType === mode ? '#f4f4f5' : '#71717a'
                }}
              >
                {mode.toUpperCase()}
              </button>
            ))}
          </div>

          {scenario.authType === 'bearer' && (
            <div style={{ marginTop: '10px' }}>
              <label style={ui.inputLabel}>Bearer Token</label>
              <input
                type="text"
                value={scenario.authToken || ''}
                onChange={e => setScenario(prev => ({ ...prev, authToken: e.target.value }))}
                style={ui.formInput}
                placeholder="JWT Token"
              />
            </div>
          )}

          {scenario.method !== 'GET' && (
            <div style={{ marginTop: '12px' }}>
              <label style={ui.inputLabel}>JSON Request Body</label>
              <textarea
                rows={5}
                value={scenario.bodyContent}
                onChange={e => setScenario(prev => ({ ...prev, bodyContent: e.target.value }))}
                style={ui.codeTextArea}
                placeholder='{ "key": "value" }'
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};