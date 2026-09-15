// src/tabs/OrchestratorTab.tsx
import React, { useMemo } from 'react';
import { Icons } from '../components/Icons';
import { ui } from '../styles';
import type {
  HttpMethod,
  ScenarioConfiguration,
  LoadEngineSettings,
  RequestTrace,
  TelemetryBucket,
  AggregatedMetrics,
  ServerProcessTelemetry
} from '../types/benchmark';

// ============================================================================
// Графики нагрузки и латентности (SVG)
// ============================================================================
const TelemetryGraphs: React.FC<{ traces: RequestTrace[]; buckets: TelemetryBucket[] }> = ({ traces, buckets }) => {
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

// ============================================================================
// График телеметрии C# Kestrel (APM)
// ============================================================================
const ServerApmWidget: React.FC<{
  current: ServerProcessTelemetry | null;
  history: ServerProcessTelemetry[];
  isConnected: boolean;
}> = ({ current, history, isConnected }) => {
  const chartHeight = 84;
  const chartWidth = 480;

  const maxMem = useMemo(() => {
    if (history.length === 0) return 150;
    const max = Math.max(...history.map(h => h.workingSetMb));
    return Math.max(max * 1.2, 50);
  }, [history]);

  return (
    <div style={ui.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: isConnected ? '#10b981' : '#71717a' }}><Icons.Cpu /></span>
          <span style={ui.cardTitle}>C# Kestrel Process Telemetry & Diagnostics (APM)</span>
        </div>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginTop: '12px' }}>
        <div style={ui.miniMetricBox}>
          <div style={ui.miniMetricLabel}>Working Set (OS RAM)</div>
          <div style={{ ...ui.miniMetricVal, color: '#a855f7' }}>
            {current ? `${current.workingSetMb}` : '--'} <span style={ui.miniUnit}>MB</span>
          </div>
          <div style={ui.miniMetricSub}>Физическая память процесса</div>
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
          <div style={{ ...ui.miniMetricVal, color: '#f59e0b' }}>
            {current ? current.threadCount : '--'}
          </div>
          <div style={ui.miniMetricSub}>Активные потоки Kestrel</div>
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

// ============================================================================
// Основной экран OrchestratorTab
// ============================================================================
interface OrchestratorTabProps {
  scenario: ScenarioConfiguration;
  setScenario: React.Dispatch<React.SetStateAction<ScenarioConfiguration>>;
  engineSettings: LoadEngineSettings;
  setEngineSettings: React.Dispatch<React.SetStateAction<LoadEngineSettings>>;
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

export const OrchestratorTab: React.FC<OrchestratorTabProps> = ({
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
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={ui.card}>
        <div style={ui.urlComposerRow}>
          <select
            value={scenario.method}
            onChange={e => setScenario({ ...scenario, method: e.target.value as HttpMethod })}
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
            onChange={e => setScenario({ ...scenario, targetUrl: e.target.value })}
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

      {/* KPI ТОП-4 КАРТОЧКИ */}
      <div style={ui.kpiGrid}>
        <div style={ui.kpiCard}>
          <span style={ui.kpiLabel}>Current Throughput</span>
          <div style={ui.kpiValueRow}>
            <span style={{ ...ui.kpiNumber, color: '#06b6d4' }}>{metrics.currentRps}</span>
            <span style={ui.kpiUnit}>req/s</span>
          </div>
          <span style={ui.kpiFooter}>Across {engineSettings.concurrency} concurrent VUs</span>
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

      {/* ГРАФИКИ НАГРУЗКИ */}
      <TelemetryGraphs traces={traces} buckets={telemetryBuckets} />

      {/* ВИДЖЕТ KESTREL PROCESS TELEMETRY (APM) */}
      <ServerApmWidget current={apmTelemetry} history={apmHistory} isConnected={isApmConnected} />

      {/* ДЕТАЛЬНАЯ МАТРИЦА ПЕРЦЕНТИЛЕЙ И ПОЛОСЫ ПРОПУСКАНИЯ */}
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

      {/* ПАРАМЕТРЫ ДВИЖКА НАГРУЗКИ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
        <div style={ui.card}>
          <div style={ui.cardTitle}>Engine Concurrency & Strategy</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
            <div>
              <label style={ui.inputLabel}>Traffic Pattern</label>
              <select
                value={engineSettings.profile}
                onChange={e => setEngineSettings({ ...engineSettings, profile: e.target.value as any })}
                style={ui.formSelect}
              >
                <option value="constant">Constant Virtual Users</option>
                <option value="ramp_up">Linear Ramp-Up</option>
                <option value="spike">Spike Surge</option>
              </select>
            </div>

            <div>
              <label style={ui.inputLabel}>Concurrent Workers (VUs): {engineSettings.concurrency}</label>
              <input
                type="range"
                min="1"
                max="100"
                value={engineSettings.concurrency}
                onChange={e => setEngineSettings({ ...engineSettings, concurrency: Number(e.target.value) })}
                style={{ width: '100%', accentColor: '#06b6d4', marginTop: '6px' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '14px' }}>
            <div>
              <label style={ui.inputLabel}>Total Reqs Limit</label>
              <input
                type="number"
                value={engineSettings.totalRequests}
                onChange={e => setEngineSettings({ ...engineSettings, totalRequests: Number(e.target.value) })}
                style={ui.formInput}
              />
            </div>

            <div>
              <label style={ui.inputLabel}>Duration (Sec, 0=None)</label>
              <input
                type="number"
                value={engineSettings.durationSeconds}
                onChange={e => setEngineSettings({ ...engineSettings, durationSeconds: Number(e.target.value) })}
                style={ui.formInput}
              />
            </div>

            <div>
              <label style={ui.inputLabel}>RPS Throttle (0=Inf)</label>
              <input
                type="number"
                value={engineSettings.rateLimitRps}
                onChange={e => setEngineSettings({ ...engineSettings, rateLimitRps: Number(e.target.value) })}
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
                onClick={() => setScenario({ ...scenario, authType: mode })}
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
                onChange={e => setScenario({ ...scenario, authToken: e.target.value })}
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
                onChange={e => setScenario({ ...scenario, bodyContent: e.target.value })}
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