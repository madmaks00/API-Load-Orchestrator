import { useState, useMemo, type Dispatch, type SetStateAction } from 'react';
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
  SpikeProfileSettings,
  PerformanceBaseline
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

      {/* Сетка переведена на 8 колонок */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '10px', marginTop: '12px' }}>
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
        </div>

        <div style={ui.miniMetricBox}>
          <div style={ui.miniMetricLabel}>Working Set (OS)</div>
          <div style={{ ...ui.miniMetricVal, color: '#a855f7' }}>
            {current ? `${current.workingSetMb}` : '--'} <span style={ui.miniUnit}>MB</span>
          </div>
        </div>

        <div style={ui.miniMetricBox}>
          <div style={ui.miniMetricLabel}>GC Managed Heap</div>
          <div style={{ ...ui.miniMetricVal, color: '#06b6d4' }}>
            {current ? `${current.allocatedMemoryMb}` : '--'} <span style={ui.miniUnit}>MB</span>
          </div>
        </div>

        {/* 1. Карточка LOH Heap */}
        <div style={{
          ...ui.miniMetricBox,
          borderColor: current?.lohSizeMb !== undefined && current.lohSizeMb > 30 ? '#f59e0b' : '#1f1f23'
        }}>
          <div style={ui.miniMetricLabel}>LOH Heap</div>
          <div style={{
            ...ui.miniMetricVal,
            color: current?.lohSizeMb === undefined
              ? '#71717a'
              : current.lohSizeMb > 30
              ? '#f59e0b'
              : '#38bdf8'
          }}>
            {current?.lohSizeMb !== undefined ? `${current.lohSizeMb}` : '--'} <span style={ui.miniUnit}>MB</span>
          </div>
        </div>

        {/* 2. Отдельная карточка POH Heap */}
        <div style={ui.miniMetricBox}>
          <div style={ui.miniMetricLabel}>POH Heap</div>
          <div style={{ ...ui.miniMetricVal, color: '#38bdf8' }}>
            {current?.pohSizeMb !== undefined ? `${current.pohSizeMb}` : '--'} <span style={ui.miniUnit}>MB</span>
          </div>
        </div>

        <div style={ui.miniMetricBox}>
          <div style={ui.miniMetricLabel}>ThreadPool</div>
          <div style={{ ...ui.miniMetricVal, color: '#38bdf8' }}>
            {current ? current.threadCount : '--'}
          </div>
        </div>

        <div style={{
          ...ui.miniMetricBox,
          borderColor: isStarving ? '#ef4444' : '#1f1f23'
        }}>
          <div style={ui.miniMetricLabel}>Queue (Pending)</div>
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
        </div>

        <div style={ui.miniMetricBox}>
          <div style={ui.miniMetricLabel}>GC (0/1/2)</div>
          <div style={{ ...ui.miniMetricVal, color: '#10b981' }}>
            {current ? `${current.gen0}/${current.gen1}/${current.gen2}` : '--'}
          </div>
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
            {isConnected ? 'Accumulating memory telemetry stream...' : 'Connect to server with active /api/system-metrics endpoint'}
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
  const [baseline, setBaseline] = useState<PerformanceBaseline | null>(() => {
    try {
      const stored = localStorage.getItem('benchmark_baseline');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

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

  const handleSaveBaseline = () => {
    const created: PerformanceBaseline = {
      id: `base-${Date.now()}`,
      savedAt: new Date().toLocaleTimeString(),
      scenarioName: scenario.name || 'Benchmark Scenario',
      targetUrl: scenario.targetUrl,
      metrics: {
        currentRps: metrics.currentRps,
        p50: metrics.p50,
        p90: metrics.p90,
        p99: metrics.p99,
        avgDurationMs: metrics.avgDurationMs,
        errorRatePercent: metrics.errorRatePercent,
        totalBytes: metrics.totalBytes,
        completed: metrics.completed
      },
      apm: apmTelemetry ? {
        workingSetMb: apmTelemetry.workingSetMb,
        allocatedMemoryMb: apmTelemetry.allocatedMemoryMb,
        threadCount: apmTelemetry.threadCount,
        cpuUsagePercent: apmTelemetry.cpuUsagePercent
      } : undefined
    };
    setBaseline(created);
    try {
      localStorage.setItem('benchmark_baseline', JSON.stringify(created));
    } catch {}
  };

  const handleClearBaseline = () => {
    setBaseline(null);
    try {
      localStorage.removeItem('benchmark_baseline');
    } catch {}
  };

  const calcDiff = (curr: number, base?: number, lowerIsBetter = false) => {
    if (base === undefined || base === 0) return null;
    const diff = curr - base;
    const pct = Math.round((diff / base) * 1000) / 10;
    const isGood = lowerIsBetter ? diff < 0 : diff > 0;
    const isNeutral = diff === 0;
    return { diff: Math.round(diff * 10) / 10, pct, isGood, isNeutral };
  };

  const diffRps = calcDiff(metrics.currentRps, baseline?.metrics.currentRps, false);
  const diffP50 = calcDiff(metrics.p50, baseline?.metrics.p50, true);
  const diffP99 = calcDiff(metrics.p99, baseline?.metrics.p99, true);
  const diffErr = calcDiff(metrics.errorRatePercent, baseline?.metrics.errorRatePercent, true);
  const diffHeap = calcDiff(
    apmTelemetry?.allocatedMemoryMb ?? 0,
    baseline?.apm?.allocatedMemoryMb,
    true
  );

  const exportJson = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      scenario,
      engineSettings,
      metrics,
      apm: apmTelemetry,
      tracesCount: traces.length,
      traces
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `benchmark-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportCsv = () => {
    if (traces.length === 0) return;
    const headers = ['id', 'timestamp', 'method', 'url', 'statusCode', 'durationMs', 'bytes', 'slaPassed', 'isError'];
    const rows = traces.map(t => [
      t.id,
      new Date(t.timestamp).toISOString(),
      t.method,
      `"${t.url.replace(/"/g, '""')}"`,
      t.statusCode,
      t.durationMs,
      t.responseBytes,
      t.assertionPassed ? 'PASS' : 'FAIL',
      t.isError ? 'TRUE' : 'FALSE'
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traces-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportHtmlReport = () => {
    const win = window.open('', '_blank');
    if (!win) return;
    const html = `<!DOCTYPE html>
<html>
<head>
  <title></title>
  <style>
    /* 2. Обнуление полей страницы полностью скрывает about:blank и дату/заголовок */
    @page {
      margin: 0;
      size: auto;
    }

    body { 
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; 
      background: #09090b; 
      color: #f4f4f5; 
      margin: 0; 
      padding: 30px; 
    }
    h1 { font-size: 22px; margin: 0 0 4px 0; color: #fff; }
    .meta { font-size: 12px; color: #71717a; margin-bottom: 24px; font-family: monospace; }
    .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
    .card { background: #111215; border: 1px solid #27272a; border-radius: 8px; padding: 14px; }
    .label { font-size: 11px; text-transform: uppercase; color: #71717a; font-weight: 600; }
    .val { font-size: 22px; font-weight: 700; margin-top: 6px; font-family: monospace; }
    .sub { font-size: 10px; color: #52525b; margin-top: 4px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 12px; }
    th, td { padding: 10px 14px; border: 1px solid #27272a; text-align: left; }
    th { background: #18181b; color: #a1a1aa; text-transform: uppercase; font-size: 10px; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 10px; font-family: monospace; }
    .pass { background: #064e3b; color: #34d399; }
    .fail { background: #7f1d1d; color: #f87171; }
    .section-title { font-size: 14px; font-weight: 700; color: #e4e4e7; margin-top: 24px; margin-bottom: 8px; }

    @media print { 
      body { 
        background: #fff; 
        color: #000; 
        padding: 15mm; 
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      } 
      .card, th, td { border-color: #ccc; background: #fff; color: #000; } 
      h1, .label, .val, .section-title { color: #000; } 

      /* 3. Скрываем кнопку "Print to PDF" при печати/сохранении в файл */
      .no-print { 
        display: none !important; 
      } 
    }
  </style>
</head>
<body>
  <h1>API Load Orchestrator — Executive Performance Report</h1>
  <div class="meta">Target: ${scenario.method} ${scenario.targetUrl} | Generated: ${new Date().toLocaleString()}</div>

  <div class="grid">
    <div class="card">
      <div class="label">Total Requests</div>
      <div class="val" style="color:#06b6d4">${metrics.completed}</div>
      <div class="sub">Duration: ${metrics.elapsedSeconds}s</div>
    </div>
    <div class="card">
      <div class="label">Throughput (RPS)</div>
      <div class="val" style="color:#06b6d4">${metrics.currentRps} <span style="font-size:12px">req/s</span></div>
      <div class="sub">Bandwidth: ${metrics.throughputKbps} KB/s</div>
    </div>
    <div class="card">
      <div class="label">Median (P50) / P99</div>
      <div class="val" style="color:#10b981">${metrics.p50} / ${metrics.p99} <span style="font-size:12px">ms</span></div>
      <div class="sub">Min: ${metrics.minDurationMs}ms | Max: ${metrics.maxDurationMs}ms</div>
    </div>
    <div class="card">
      <div class="label">Error Rate</div>
      <div class="val" style="color:${metrics.errorRatePercent > 0 ? '#f43f5e' : '#10b981'}">${metrics.errorRatePercent}%</div>
      <div class="sub">2xx: ${metrics.status2xx} | 4xx: ${metrics.status4xx} | 5xx: ${metrics.status5xx}</div>
    </div>
  </div>

  <div class="section-title">Latency SLA Distribution Matrix</div>
  <div class="grid" style="grid-template-columns: repeat(8, 1fr)">
    <div class="card"><div class="label">Min</div><div class="val" style="font-size:15px">${metrics.minDurationMs}ms</div></div>
    <div class="card"><div class="label">P50</div><div class="val" style="font-size:15px; color:#10b981">${metrics.p50}ms</div></div>
    <div class="card"><div class="label">P75</div><div class="val" style="font-size:15px">${metrics.p75}ms</div></div>
    <div class="card"><div class="label">P90</div><div class="val" style="font-size:15px">${metrics.p90}ms</div></div>
    <div class="card"><div class="label">P95</div><div class="val" style="font-size:15px">${metrics.p95}ms</div></div>
    <div class="card"><div class="label">P99</div><div class="val" style="font-size:15px; color:#f59e0b">${metrics.p99}ms</div></div>
    <div class="card"><div class="label">P99.9</div><div class="val" style="font-size:15px; color:#f43f5e">${metrics.p999}ms</div></div>
    <div class="card"><div class="label">StdDev</div><div class="val" style="font-size:15px">±${metrics.stdDev}ms</div></div>
  </div>

  ${apmTelemetry ? `
  <div class="section-title">C# Kestrel Process Telemetry (APM Diagnostics)</div>
  <div class="grid" style="grid-template-columns: repeat(5, 1fr)">
    <div class="card"><div class="label">CPU Usage</div><div class="val" style="font-size:16px; color:#38bdf8">${apmTelemetry.cpuUsagePercent ?? 0}%</div></div>
    <div class="card"><div class="label">OS Working Set</div><div class="val" style="font-size:16px; color:#a855f7">${apmTelemetry.workingSetMb} MB</div></div>
    <div class="card"><div class="label">GC Managed Heap</div><div class="val" style="font-size:16px; color:#06b6d4">${apmTelemetry.allocatedMemoryMb} MB</div></div>
    <div class="card"><div class="label">LOH / POH Heap</div><div class="val" style="font-size:16px">${apmTelemetry.lohSizeMb ?? 0} MB / ${apmTelemetry.pohSizeMb ?? 0} MB</div></div>
    <div class="card"><div class="label">ThreadPool Threads</div><div class="val" style="font-size:16px">${apmTelemetry.threadCount} (Queue: ${apmTelemetry.pendingWorkItemCount ?? 0})</div></div>
  </div>
  ` : ''}

  <div class="section-title">SLA Assertions & Quality Gates</div>
  <table>
    <thead>
      <tr>
        <th>Rule ID</th>
        <th>Evaluation Field</th>
        <th>Condition</th>
        <th>Target Threshold</th>
        <th>Result</th>
      </tr>
    </thead>
    <tbody>
      ${engineSettings.assertions.map(rule => `
        <tr>
          <td><code>${rule.id}</code></td>
          <td>${rule.field.toUpperCase()}</td>
          <td>${rule.operator}</td>
          <td><code>${rule.targetValue}</code></td>
          <td><span class="badge ${rule.enabled ? 'pass' : 'fail'}">${rule.enabled ? 'EVALUATED' : 'DISABLED'}</span></td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="no-print" style="margin-top: 30px; text-align: right">
    <button onclick="window.print()" style="padding: 8px 18px; font-weight: 600; cursor: pointer; border-radius: 4px; border: 1px solid #3f3f46; background: #27272a; color: #fff;">
      Print to PDF
    </button>
  </div>
</body>
</html>`;
    win.document.write(html);
    win.document.close();
  };

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

          {metrics.completed > 0 && (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
    {/* Кнопка Baseline */}
    <button
      type="button"
      onClick={handleSaveBaseline}
      title="Save current metrics as performance baseline"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        height: '32px',
        padding: '0 10px',
        fontSize: '11px',
        fontWeight: 500,
        fontFamily: 'monospace',
        color: '#38bdf8',
        backgroundColor: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '6px',
        cursor: 'pointer',
        transition: 'all 0.15s ease'
      }}
      onMouseEnter={e => {
        e.currentTarget.style.backgroundColor = '#1e293b';
        e.currentTarget.style.borderColor = '#0284c7';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.backgroundColor = '#0f172a';
        e.currentTarget.style.borderColor = '#1e293b';
      }}
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="3" />
      </svg>
      <span>Set Baseline</span>
    </button>

    <div style={{ width: '1px', height: '18px', backgroundColor: '#27272a' }} />

    {/* Сегментированная группа экспорта: Report / CSV / JSON */}
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        backgroundColor: '#121215',
        border: '1px solid #27272a',
        borderRadius: '6px',
        padding: '2px',
        height: '32px'
      }}
    >
      {/* Report (HTML/PDF) */}
      <button
        type="button"
        onClick={exportHtmlReport}
        title="Generate printable Executive HTML / PDF report"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          height: '26px',
          padding: '0 9px',
          fontSize: '11px',
          fontWeight: 500,
          color: '#e4e4e7',
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = '#27272a';
          e.currentTarget.style.color = '#10b981';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#e4e4e7';
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
        <span>Report</span>
      </button>

      <div style={{ width: '1px', height: '14px', backgroundColor: '#27272a' }} />

      {/* CSV */}
      <button
        type="button"
        onClick={exportCsv}
        title="Export raw traces to CSV"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          height: '26px',
          padding: '0 9px',
          fontSize: '11px',
          fontWeight: 500,
          color: '#a1a1aa',
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = '#27272a';
          e.currentTarget.style.color = '#f4f4f5';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#a1a1aa';
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18M15 3v18" />
        </svg>
        <span>CSV</span>
      </button>

      <div style={{ width: '1px', height: '14px', backgroundColor: '#27272a' }} />

      {/* JSON */}
      <button
        type="button"
        onClick={exportJson}
        title="Export benchmark metrics and config as JSON"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          height: '26px',
          padding: '0 9px',
          fontSize: '11px',
          fontWeight: 500,
          color: '#a1a1aa',
          backgroundColor: 'transparent',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          transition: 'all 0.15s ease'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.backgroundColor = '#27272a';
          e.currentTarget.style.color = '#f4f4f5';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#a1a1aa';
        }}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
        <span>JSON</span>
      </button>
    </div>
  </div>
)}
        </div>
      </div>

      {baseline && (
        <div
          style={{
            backgroundColor: '#0c1017',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8' }}>
                Baseline Diff & Performance Regression Watch
              </span>
              <span style={{ fontSize: '11px', color: '#64748b' }}>
                Reference saved at {baseline.savedAt} ({baseline.metrics.completed} calls)
              </span>
            </div>
            <button
              onClick={handleClearBaseline}
              style={{
                fontSize: '11px',
                color: '#94a3b8',
                background: 'transparent',
                border: '1px solid #334155',
                borderRadius: '4px',
                padding: '2px 8px',
                cursor: 'pointer'
              }}
            >
              Clear Baseline
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
            <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Throughput (RPS)</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', marginTop: '3px' }}>
                {metrics.currentRps} <span style={{ fontSize: '11px', color: '#64748b' }}>vs {baseline.metrics.currentRps}</span>
              </div>
              {diffRps && (
                <div style={{ fontSize: '11px', fontWeight: 600, color: diffRps.isGood ? '#34d399' : '#f87171', marginTop: '2px' }}>
                  {diffRps.diff > 0 ? '▲ +' : '▼ '}{diffRps.diff} ({diffRps.pct > 0 ? '+' : ''}{diffRps.pct}%)
                </div>
              )}
            </div>

            <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>P50 Median Latency</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', marginTop: '3px' }}>
                {metrics.p50} ms <span style={{ fontSize: '11px', color: '#64748b' }}>vs {baseline.metrics.p50} ms</span>
              </div>
              {diffP50 && (
                <div style={{ fontSize: '11px', fontWeight: 600, color: diffP50.isGood ? '#34d399' : '#f87171', marginTop: '2px' }}>
                  {diffP50.diff > 0 ? '▲ +' : '▼ '}{diffP50.diff} ms ({diffP50.pct > 0 ? '+' : ''}{diffP50.pct}%)
                </div>
              )}
            </div>

            <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>P99 Tail Latency</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', marginTop: '3px' }}>
                {metrics.p99} ms <span style={{ fontSize: '11px', color: '#64748b' }}>vs {baseline.metrics.p99} ms</span>
              </div>
              {diffP99 && (
                <div style={{ fontSize: '11px', fontWeight: 600, color: diffP99.isGood ? '#34d399' : '#f87171', marginTop: '2px' }}>
                  {diffP99.diff > 0 ? '▲ +' : '▼ '}{diffP99.diff} ms ({diffP99.pct > 0 ? '+' : ''}{diffP99.pct}%)
                </div>
              )}
            </div>

            <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>Error Rate</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', marginTop: '3px' }}>
                {metrics.errorRatePercent}% <span style={{ fontSize: '11px', color: '#64748b' }}>vs {baseline.metrics.errorRatePercent}%</span>
              </div>
              {diffErr && (
                <div style={{ fontSize: '11px', fontWeight: 600, color: diffErr.isGood ? '#34d399' : '#f87171', marginTop: '2px' }}>
                  {diffErr.diff > 0 ? '▲ +' : '▼ '}{diffErr.diff}%
                </div>
              )}
            </div>

            <div style={{ backgroundColor: '#0f172a', padding: '10px', borderRadius: '6px', border: '1px solid #1e293b' }}>
              <div style={{ fontSize: '10px', color: '#94a3b8', textTransform: 'uppercase' }}>GC Heap (Memory)</div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc', marginTop: '3px' }}>
                {apmTelemetry ? `${apmTelemetry.allocatedMemoryMb} MB` : '--'}{' '}
                <span style={{ fontSize: '11px', color: '#64748b' }}>
                  vs {baseline.apm?.allocatedMemoryMb ? `${baseline.apm.allocatedMemoryMb} MB` : '--'}
                </span>
              </div>
              {diffHeap && (
                <div style={{ fontSize: '11px', fontWeight: 600, color: diffHeap.isGood ? '#34d399' : '#f87171', marginTop: '2px' }}>
                  {diffHeap.diff > 0 ? '▲ +' : '▼ '}{diffHeap.diff} MB ({diffHeap.pct > 0 ? '+' : ''}{diffHeap.pct}%)
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={ui.kpiGrid}>
        <div style={ui.kpiCard}>
          <span style={ui.kpiLabel}>Current Throughput</span>
          <div style={ui.kpiValueRow}>
            <span style={{ ...ui.kpiNumber, color: '#06b6d4' }}>{metrics.currentRps}</span>
            <span style={ui.kpiUnit}>req/s</span>
            {diffRps && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  marginLeft: 'auto',
                  color: diffRps.isGood ? '#10b981' : '#f43f5e'
                }}
              >
                {diffRps.pct > 0 ? '+' : ''}{diffRps.pct}%
              </span>
            )}
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
            {diffP50 && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  marginLeft: 'auto',
                  color: diffP50.isGood ? '#10b981' : '#f43f5e'
                }}
              >
                {diffP50.pct > 0 ? '+' : ''}{diffP50.pct}%
              </span>
            )}
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
            {diffP99 && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  marginLeft: 'auto',
                  color: diffP99.isGood ? '#10b981' : '#f43f5e'
                }}
              >
                {diffP99.pct > 0 ? '+' : ''}{diffP99.pct}%
              </span>
            )}
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
            {diffErr && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  marginLeft: 'auto',
                  color: diffErr.isGood ? '#10b981' : '#f43f5e'
                }}
              >
                {diffErr.diff > 0 ? '+' : ''}{diffErr.diff}%
              </span>
            )}
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
                min="0"
                placeholder="0"
                value={engineSettings.totalRequests === 0 ? '' : engineSettings.totalRequests}
                onFocus={e => e.target.select()}
                onChange={e => {
                  const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0;
                  setEngineSettings(prev => ({ ...prev, totalRequests: val }));
                }}
                style={ui.formInput}
              />
            </div>

            <div>
              <label style={ui.inputLabel}>Duration (Sec, 0=None)</label>
              <input
                type="number"
                min="0"
                placeholder="0"
                disabled={engineSettings.profile !== 'constant'}
                value={
                  engineSettings.profile === 'ramp_up'
                    ? (totalRampTime === 0 ? '' : totalRampTime)
                    : engineSettings.profile === 'spike'
                    ? (totalSpikeTime === 0 ? '' : totalSpikeTime)
                    : (engineSettings.durationSeconds === 0 ? '' : engineSettings.durationSeconds)
                }
                onFocus={e => e.target.select()}
                onChange={e => {
                  const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0;
                  setEngineSettings(prev => ({ ...prev, durationSeconds: val }));
                }}
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
                min="0"
                placeholder="0"
                value={engineSettings.rateLimitRps === 0 ? '' : engineSettings.rateLimitRps}
                onFocus={e => e.target.select()}
                onChange={e => {
                  const val = e.target.value === '' ? 0 : parseInt(e.target.value, 10) || 0;
                  setEngineSettings(prev => ({ ...prev, rateLimitRps: val }));
                }}
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ ...ui.inputLabel, margin: 0 }}>JSON Request Body</label>
                <div style={{ display: 'flex', gap: '4px' }}>
                  {['{{$guid}}', '{{$timestamp}}', '{{$randomInt(1, 1000)}}', '{{$userId}}'].map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setScenario(prev => ({
                          ...prev,
                          bodyContent: prev.bodyContent ? `${prev.bodyContent} ${tag}` : tag
                        }));
                      }}
                      style={{
                        fontSize: '9px',
                        fontFamily: 'monospace',
                        backgroundColor: '#18181b',
                        color: '#06b6d4',
                        border: '1px solid #27272a',
                        borderRadius: '4px',
                        padding: '2px 5px',
                        cursor: 'pointer'
                      }}
                    >
                      +{tag}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                rows={5}
                value={scenario.bodyContent}
                onChange={e => setScenario(prev => ({ ...prev, bodyContent: e.target.value }))}
                style={ui.codeTextArea}
                placeholder='{ "id": "{{$guid}}", "userId": {{$userId}}, "num": {{$randomInt(1, 1000)}} }'
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};